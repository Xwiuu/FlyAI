"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  sendUserMessage,
  advanceMeeting,
} from "@/app/(protected)/agentes/meetings/actions"
import type { Meeting, MeetingMessage, MeetingSender } from "@/lib/supabase/queries"

interface MeetingRoomProps {
  meeting: Meeting
  initialMessages: MeetingMessage[]
}

const SENDER_LABEL: Record<MeetingSender, string> = {
  user: "Você (founder)",
  research_agent: "Research Agent",
  content_agent: "Content Agent",
  ceo_agent: "CEO Agent",
  analytics_agent: "Analytics Agent",
  devils_advocate: "Advogado do Diabo",
}

const SENDER_COLOR: Record<MeetingSender, string> = {
  user: "border-l-2 border-emerald-500/60",
  research_agent: "border-l-2 border-blue-500/60",
  content_agent: "border-l-2 border-amber-500/60",
  ceo_agent: "border-l-2 border-primary",
  analytics_agent: "border-l-2 border-purple-500/60",
  devils_advocate: "border-l-2 border-red-500/60",
}

export function MeetingRoom({ meeting, initialMessages }: MeetingRoomProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Light polling while the meeting is active and we're waiting on an agent turn.
  useEffect(() => {
    if (meeting.status !== "active") return
    const id = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(id)
  }, [meeting.status, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [initialMessages.length])

  function onSend(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = draft.trim()
    if (trimmed.length === 0) return
    startTransition(async () => {
      const res = await sendUserMessage(meeting.id, trimmed)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setDraft("")
      router.refresh()
    })
  }

  function onAdvance() {
    setError(null)
    startTransition(async () => {
      const res = await advanceMeeting(meeting.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  const canSend = meeting.status === "awaiting_user" && !pending
  const canAdvance = meeting.status === "active" && !pending

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        {initialMessages.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            Aguardando o primeiro turno do agente…
          </p>
        ) : (
          initialMessages.map((m) => (
            <article
              key={m.id}
              className={`rounded-md bg-muted/30 px-4 py-3 ${SENDER_COLOR[m.sender]}`}
            >
              <header className="mb-2 flex items-baseline justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {SENDER_LABEL[m.sender]}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  turno #{m.sequence}
                </p>
              </header>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {m.content}
              </div>
            </article>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {meeting.status === "completed" || meeting.status === "archived" ? (
        <div className="rounded-xl border border-border bg-card px-5 py-4 text-center text-xs text-muted-foreground">
          Reunião encerrada.
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-border bg-card p-5">
          <form onSubmit={onSend} className="space-y-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              disabled={!canSend}
              placeholder={
                canSend
                  ? "Sua resposta para o agente…"
                  : meeting.status === "active"
                    ? "Aguardando o agente responder…"
                    : "Esta reunião não está mais aceitando mensagens."
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] text-muted-foreground">
                Status: {meeting.status}
                {meeting.status === "active" && " · polling a cada 3s"}
              </p>
              <div className="flex gap-2">
                {canAdvance && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onAdvance}
                    disabled={pending}
                  >
                    {pending ? "Avançando…" : "Avançar turno"}
                  </Button>
                )}
                <Button type="submit" disabled={!canSend || draft.trim().length === 0}>
                  {pending ? "Enviando…" : "Enviar"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
