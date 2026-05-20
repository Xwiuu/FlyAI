"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import type { LifecycleStage, Transaction, FirstPaymentStatus } from "@/lib/supabase/queries"

export type ActionResult = { ok: true } | { ok: false; error: string }

async function requireAuthorized() {
  const supabase = createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: authorized } = await supabase
    .from("authorized_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!authorized) return null
  return user
}

const VALID_STAGES: LifecycleStage[] = ["onboarding", "active", "at_risk", "churned"]

export async function updateClientLifecycle(
  clientId: string,
  stage: LifecycleStage,
): Promise<ActionResult> {
  if (!VALID_STAGES.includes(stage)) {
    return { ok: false, error: "Estágio de ciclo inválido." }
  }

  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const supabase = createSupabaseClient()

  // Keep legacy status in sync so anywhere that still reads it doesn't drift.
  const legacyStatus =
    stage === "churned" ? "churned" : stage === "at_risk" ? "paused" : "active"

  const { error } = await supabase
    .from("clients")
    .update({ lifecycle_stage: stage, status: legacyStatus })
    .eq("id", clientId)

  if (error) {
    console.error("[updateClientLifecycle] db error:", error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath("/clientes")
  revalidatePath("/overview")
  return { ok: true }
}

export async function fetchClientInvoices(
  clientId: string,
): Promise<{ ok: true; invoices: Transaction[] } | { ok: false; error: string }> {
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("client_id", clientId)
    .not("invoice_status", "is", null)
    .order("date", { ascending: false })

  if (error) {
    console.error("[fetchClientInvoices] db error:", error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true, invoices: (data ?? []) as Transaction[] }
}

const createClientSchema = z
  .object({
    name: z.string().trim().min(1, "Nome obrigatório").max(255),
    email: z.string().trim().email("Email inválido"),
    phone: z.string().trim().max(20).optional(),
    ticket: z.number().positive("Ticket deve ser maior que zero"),
    project_title: z.string().trim().min(1, "Título do projeto obrigatório").max(255),
    briefing: z.string().trim().optional(),
    recurring: z.boolean(),
    recurring_amount: z.number().positive("Valor recorrente deve ser maior que zero").optional(),
    payment_method: z.enum(["pix", "boleto", "credit_card"]),
    nf_config: z.enum(["automatic", "manual"]),
    contract_url: z
      .string()
      .trim()
      .url("URL do contrato inválida")
      .or(z.literal("")),
    first_payment_status: z.enum(["paid", "pending", "overdue"]),
  })
  .refine(
    (d) => !d.recurring || (d.recurring_amount !== undefined && d.recurring_amount > 0),
    { message: "Informe o valor recorrente mensal.", path: ["recurring_amount"] },
  )

export type CreateClientInput = z.infer<typeof createClientSchema>

async function generateInvoiceNumber(supabase: ReturnType<typeof createSupabaseClient>): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .not("invoice_number", "is", null)
  const seq = String((count ?? 0) + 1).padStart(4, "0")
  return `NF-${year}-${seq}`
}

export async function createClient(input: CreateClientInput): Promise<ActionResult> {
  const parsed = createClientSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const supabase = createSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)

  // Insert client and return the new row id for the auto-invoice step.
  const { data: clientRow, error: clientError } = await supabase
    .from("clients")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      ticket: parsed.data.ticket,
      status: "active",
      lifecycle_stage: "onboarding",
      started_at: today,
      project_title: parsed.data.project_title,
      briefing: parsed.data.briefing || null,
      recurring: parsed.data.recurring,
      recurring_amount: parsed.data.recurring_amount ?? null,
      payment_method: parsed.data.payment_method,
      nf_config: parsed.data.nf_config,
      contract_url: parsed.data.contract_url || null,
    })
    .select("id")
    .single()

  if (clientError) {
    console.error("[createClient] insert error:", clientError.message)
    return { ok: false, error: clientError.message }
  }

  // Auto-generate the first invoice as a transaction so MRR and OKR sources
  // reflect the new client immediately without manual data entry.
  const invoiceNumber = await generateInvoiceNumber(supabase)
  const { error: txError } = await supabase.from("transactions").insert({
    type: "income",
    description: `Primeira parcela — ${parsed.data.project_title}`,
    amount: parsed.data.ticket,
    category: "mrr",
    date: today,
    client_id: clientRow.id,
    invoice_status: parsed.data.first_payment_status as FirstPaymentStatus,
    invoice_number: invoiceNumber,
  })

  if (txError) {
    console.error("[createClient] invoice insert error:", txError.message)
    // Client was already created — don't surface a hard error, but warn.
    return { ok: false, error: `Cliente criado, mas falha ao gerar NF: ${txError.message}` }
  }

  revalidatePath("/clientes")
  revalidatePath("/overview")
  revalidatePath("/financeiro")
  revalidatePath("/okrs")
  return { ok: true }
}
