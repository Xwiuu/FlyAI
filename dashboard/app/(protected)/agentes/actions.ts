"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ApproveResult = { ok: true } | { ok: false; error: string }

async function requireAuthorized() {
  const supabase = createClient()
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

export async function approvePost(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase
    .from("posts")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", id)

  if (error) {
    console.error("[approvePost] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  revalidatePath("/overview")
  return { ok: true }
}

export async function rejectPost(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase
    .from("posts")
    .update({ status: "rejected" })
    .eq("id", id)

  if (error) {
    console.error("[rejectPost] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  revalidatePath("/overview")
  return { ok: true }
}

export async function approveBrief(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase
    .from("briefs")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("[approveBrief] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  revalidatePath("/overview")
  return { ok: true }
}

export async function approveWeeklyPlan(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase
    .from("weekly_plans")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("[approveWeeklyPlan] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  return { ok: true }
}

export async function archiveWeeklyPlan(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase
    .from("weekly_plans")
    .update({ status: "archived" })
    .eq("id", id)

  if (error) {
    console.error("[archiveWeeklyPlan] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  return { ok: true }
}
