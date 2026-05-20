"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBRL, formatDateShort } from "@/lib/format"
import type { Client, LifecycleStage } from "@/lib/supabase/queries"
import { ClientDetailSheet } from "@/components/dashboard/client-detail-sheet"

type Column = {
  stage: LifecycleStage
  label: string
  accent: string
  hint: string
}

const COLUMNS: Column[] = [
  {
    stage: "onboarding",
    label: "Onboarding",
    accent: "border-emerald-500/40 text-emerald-300",
    hint: "Novos setups em andamento",
  },
  {
    stage: "active",
    label: "Ativos",
    accent: "border-sky-500/40 text-sky-300",
    hint: "Rodando estável",
  },
  {
    stage: "at_risk",
    label: "Risco de Churn",
    accent: "border-amber-500/40 text-amber-300",
    hint: "Alerta de uso ou engajamento",
  },
  {
    stage: "churned",
    label: "Encerrados",
    accent: "border-zinc-500/40 text-zinc-400",
    hint: "Histórico arquivado",
  },
]

function ClientCard({
  client,
  onOpen,
  delay,
}: {
  client: Client
  onOpen: () => void
  delay: number
}) {
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.18 }}
      onClick={onOpen}
      className="w-full rounded-lg border border-border bg-card px-3 py-3 text-left transition-colors hover:border-foreground/30 hover:bg-muted/30"
    >
      <p className="truncate text-sm font-medium">{client.name}</p>
      {client.email && (
        <p className="truncate text-[11px] text-muted-foreground">{client.email}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm font-semibold tabular-nums">{formatBRL(client.ticket)}</p>
        <p className="text-[10px] text-muted-foreground">
          desde {formatDateShort(client.started_at)}
        </p>
      </div>
      {client.tokens_used_mtd > 0 && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span className="tabular-nums">
            {client.tokens_used_mtd.toLocaleString("pt-BR")} tokens MTD
          </span>
        </div>
      )}
    </motion.button>
  )
}

export function ClientsKanban({ clients }: { clients: Client[] }) {
  const [selected, setSelected] = useState<Client | null>(null)

  const byStage: Record<LifecycleStage, Client[]> = {
    onboarding: [],
    active: [],
    at_risk: [],
    churned: [],
  }
  for (const c of clients) {
    const stage = (c.lifecycle_stage ?? "active") as LifecycleStage
    if (byStage[stage]) byStage[stage].push(c)
    else byStage.active.push(c)
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const list = byStage[col.stage]
          return (
            <div
              key={col.stage}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-3"
            >
              <div className={cn("flex items-center justify-between border-b pb-2", col.accent)}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                    {col.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{col.hint}</p>
                </div>
                <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {list.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {list.length === 0 ? (
                  <p className="px-1 py-6 text-center text-[11px] text-muted-foreground/70">
                    Nenhum cliente
                  </p>
                ) : (
                  list.map((client, i) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      delay={i * 0.03}
                      onOpen={() => setSelected(client)}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ClientDetailSheet
        client={selected}
        open={selected !== null}
        onOpenChange={(o) => {
          if (!o) setSelected(null)
        }}
      />
    </>
  )
}
