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

  const { error } = await supabase.from("transactions").insert({
    description: payload.description,
    amount: payload.amount,
    type: payload.type,
    date: payload.date,
    category: null,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath("/financeiro")
  revalidatePath("/overview")
  return { ok: true }
}
