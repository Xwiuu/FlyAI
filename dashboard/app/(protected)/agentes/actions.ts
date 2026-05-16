"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ApproveResult = { ok: true } | { ok: false; error: string }

export async function approvePost(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Não autenticado." }

  const { error } = await supabase
    .from("posts")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/agentes")
  revalidatePath("/overview")
  return { ok: true }
}

export async function rejectPost(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Não autenticado." }

  const { error } = await supabase
    .from("posts")
    .update({ status: "rejected" })
    .eq("id", id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/agentes")
  revalidatePath("/overview")
  return { ok: true }
}

export async function approveBrief(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Não autenticado." }

  const { error } = await supabase
    .from("briefs")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/agentes")
  revalidatePath("/overview")
  return { ok: true }
}
