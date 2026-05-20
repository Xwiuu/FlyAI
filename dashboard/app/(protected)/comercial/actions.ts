"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { createClient as createClientRecord } from "@/app/(protected)/clientes/actions"
import type { DealStage } from "@/lib/supabase/queries"

export type ActionResult = { ok: true } | { ok: false; error: string }

async function requireAuthorized() {
  const supabase = createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: authorized } = await supabase
    .from("authorized_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!authorized) return null
  return user
}

const VALID_STAGES: DealStage[] = ["lead", "call", "proposal", "won", "lost"]

const createDealSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(255),
  value: z.number().min(0, "Valor deve ser positivo"),
  probability: z.number().int().min(0).max(100).default(10),
  stage: z.enum(["lead", "call", "proposal", "won", "lost"]).default("lead"),
  contact_name: z.string().trim().max(255).optional(),
  contact_email: z
    .string()
    .trim()
    .email("Email inválido")
    .or(z.literal(""))
    .optional(),
  contact_phone: z.string().trim().max(50).optional(),
  notes: z.string().trim().optional(),
})

export type CreateDealInput = z.infer<typeof createDealSchema>

export async function createDeal(input: CreateDealInput): Promise<ActionResult> {
  const parsed = createDealSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const supabase = createSupabaseClient()
  const { error } = await supabase.from("deals").insert({
    title: parsed.data.title,
    value: parsed.data.value,
    probability: parsed.data.probability,
    stage: parsed.data.stage,
    contact_name: parsed.data.contact_name || null,
    contact_email: parsed.data.contact_email || null,
    contact_phone: parsed.data.contact_phone || null,
    notes: parsed.data.notes || null,
  })

  if (error) {
    console.error("[createDeal]", error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath("/comercial")
  revalidatePath("/overview")
  return { ok: true }
}

export async function updateDealStage(
  dealId: string,
  stage: DealStage,
): Promise<ActionResult> {
  if (!VALID_STAGES.includes(stage)) {
    return { ok: false, error: "Estágio inválido." }
  }

  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const supabase = createSupabaseClient()
  const { error } = await supabase
    .from("deals")
    .update({ stage })
    .eq("id", dealId)

  if (error) {
    console.error("[updateDealStage]", error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath("/comercial")
  revalidatePath("/overview")
  return { ok: true }
}

export async function deleteDeal(dealId: string): Promise<ActionResult> {
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const supabase = createSupabaseClient()
  const { error } = await supabase.from("deals").delete().eq("id", dealId)

  if (error) {
    console.error("[deleteDeal]", error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath("/comercial")
  revalidatePath("/overview")
  return { ok: true }
}

const materializeSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  project_title: z.string().trim().min(1, "Título do projeto obrigatório").max(255),
  briefing: z.string().trim().optional(),
  payment_method: z.enum(["pix", "boleto", "credit_card"]),
  nf_config: z.enum(["automatic", "manual"]),
  first_payment_status: z.enum(["paid", "pending", "overdue"]),
  recurring: z.boolean(),
  recurring_amount: z.number().positive().optional(),
  contract_url: z.string().trim().url().or(z.literal("")).optional(),
})

export type MaterializeInput = z.infer<typeof materializeSchema>

export async function materializeAsClient(
  dealId: string,
  extra: MaterializeInput,
): Promise<ActionResult> {
  const parsed = materializeSchema.safeParse(extra)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const supabase = createSupabaseClient()

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .single()

  if (dealError || !deal) {
    return { ok: false, error: "Deal não encontrado." }
  }

  if (deal.value <= 0) {
    return { ok: false, error: "O valor do deal deve ser maior que zero para criar um cliente." }
  }

  const result = await createClientRecord({
    name: (deal.contact_name as string | null) || deal.title,
    email: parsed.data.email,
    phone: (deal.contact_phone as string | null) ?? undefined,
    ticket: deal.value as number,
    project_title: parsed.data.project_title,
    briefing: parsed.data.briefing,
    recurring: parsed.data.recurring,
    recurring_amount: parsed.data.recurring_amount,
    payment_method: parsed.data.payment_method,
    nf_config: parsed.data.nf_config,
    contract_url: parsed.data.contract_url ?? "",
    first_payment_status: parsed.data.first_payment_status,
  })

  if (!result.ok) return result

  await supabase.from("deals").update({ stage: "won" }).eq("id", dealId)

  revalidatePath("/comercial")
  revalidatePath("/clientes")
  revalidatePath("/overview")
  revalidatePath("/financeiro")
  return { ok: true }
}
