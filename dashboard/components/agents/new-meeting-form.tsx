"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { startMeeting } from "@/app/(protected)/agentes/meetings/actions"
import type { MeetingType } from "@/lib/supabase/queries"

const TYPES: Array<{ value: MeetingType; label: string; hint: string }> = [
  {
    value: "ad_hoc",
    label: "Ad-hoc",
    hint: "Pergunta livre ao CEO Agent. Sem fluxo pré-definido.",
  },
  {
    value: "weekly_planning",
    label: "Planejamento semanal",
    hint: "Research → CEO → você → Content → CEO.",
  },
  {
    value: "content_review",
    label: "Revisão de conteúdo",
    hint: "Content → Advogado do Diabo → você → CEO.",
  },
  {
    value: "crisis",
    label: "Crise",
    hint: "Analytics → CEO → você → CEO.",
  },
]

export function NewMeetingForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [type, setType] = useState<MeetingType>("ad_hoc")
  const [title, setTitle] = useState("")
  const [opening, setOpening] = useState("")
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (title.trim().length === 0) {
      setError("Dê um título à reunião.")
      return
    }
    startTransition(async () => {
      const res = await startMeeting({
        type,
        title: title.trim(),
        opening: opening.trim() || undefined,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      if (res.data?.id) router.push(`/agentes/meetings/${res.data.id}` as never)
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {TYPES.map((t) => (
          <label
            key={t.value}
            className={`cursor-pointer rounded-lg border p-3 transition-colors ${
              type === t.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/40"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={t.value}
              checked={type === t.value}
              onChange={() => setType(t.value)}
              className="sr-only"
            />
            {/* span instead of p — label is phrasing content, p is block and causes reparse */}
            <span className="block text-xs font-medium">{t.label}</span>
            <span className="mt-1 block text-[10px] leading-snug text-muted-foreground">{t.hint}</span>
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Título
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Pilar da semana — quebra de margem"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Briefing inicial (opcional)
        </label>
        <textarea
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
          rows={3}
          placeholder="Contexto que os agentes devem ler antes do primeiro turno."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Iniciando…" : "Iniciar reunião"}
        </Button>
      </div>
    </form>
  )
}
