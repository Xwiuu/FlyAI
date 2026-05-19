"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  startMeeting as orchestratorStart,
  sendUserMessage as orchestratorSendUser,
  runMeetingTurn as orchestratorAdvance,
} from "@flyai/agents/agents/meeting-orchestrator"
import type { MeetingType } from "@flyai/agents/lib/meetings"

export type MeetingActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

async function requireUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function startMeeting(input: {
  type: MeetingType
  title: string
  opening?: string
}): Promise<MeetingActionResult<{ id: string }>> {
  const user = await requireUser()
  if (!user) return { ok: false, error: "Não autenticado." }

  try {
    const { meeting_id } = await orchestratorStart({
      type: input.type,
      title: input.title,
      opening: input.opening,
    })
    revalidatePath("/agentes/meetings")
    revalidatePath(`/agentes/meetings/${meeting_id}`)
    return { ok: true, data: { id: meeting_id } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function sendUserMessage(
  meeting_id: string,
  content: string,
): Promise<MeetingActionResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: "Não autenticado." }

  try {
    await orchestratorSendUser({ meeting_id, content })
    revalidatePath(`/agentes/meetings/${meeting_id}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function advanceMeeting(
  meeting_id: string,
): Promise<MeetingActionResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: "Não autenticado." }

  try {
    await orchestratorAdvance({ meeting_id })
    revalidatePath(`/agentes/meetings/${meeting_id}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
