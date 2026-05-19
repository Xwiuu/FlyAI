"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type AddTransactionResult = { ok: true } | { ok: false; error: string }

export async function addTransaction(payload: {
  description: string
  amount: number
  type: "income" | "expense"
  date: string
}): Promise<AddTransactionResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: "Não autenticado." }

  const { data: authorized } = await supabase
    .from("authorized_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!authorized) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase.from("transactions").insert({
    description: payload.description,
    amount: payload.amount,
    type: payload.type,
    date: payload.date,
    category: null,
  })

  if (error) {
    console.error("[addTransaction] db error:", error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath("/financeiro")
  revalidatePath("/overview")
  return { ok: true }
}
