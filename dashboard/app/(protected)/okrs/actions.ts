"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"

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

const krSchema = z.object({
  title: z.string().trim().min(1, "Título da KR obrigatório"),
  target: z.number().positive("Target deve ser maior que zero"),
  unit: z.string().trim().min(1, "Unidade obrigatória"),
  source: z.enum(["manual", "mrr_income", "posts_generated", "retention_rate"]),
})

const createOkrSchema = z.object({
  objective: z.string().trim().min(1, "Objetivo obrigatório"),
  quarter: z
    .string()
    .trim()
    .regex(/^Q[1-4]\s+\d{4}$/i, "Quarter deve ter o formato 'Q2 2026'"),
  key_results: z.array(krSchema).min(1, "Adicione ao menos uma key result"),
})

export type CreateOkrInput = z.infer<typeof createOkrSchema>

export async function createOkr(input: CreateOkrInput): Promise<ActionResult> {
  const parsed = createOkrSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const supabase = createSupabaseClient()

  // Normalize the quarter to uppercase 'Q' and a single space so the
  // resolver regex in lib/okrs/aggregations.ts parses it without surprises.
  const quarterNormalized = parsed.data.quarter
    .replace(/\s+/g, " ")
    .replace(/^q/i, "Q")

  const key_results = parsed.data.key_results.map((kr) => ({
    title: kr.title,
    target: kr.target,
    current: 0,
    unit: kr.unit,
    source: kr.source === "manual" ? null : kr.source,
  }))

  const { error } = await supabase.from("okrs").insert({
    objective: parsed.data.objective,
    quarter: quarterNormalized,
    key_results,
    status: "active",
  })

  if (error) {
    console.error("[createOkr] db error:", error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath("/okrs")
  revalidatePath("/overview")
  return { ok: true }
}
