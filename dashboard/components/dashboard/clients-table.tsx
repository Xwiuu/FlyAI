"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyModule } from "@/components/dashboard/empty-module"
import { Users } from "lucide-react"
import { formatBRL, formatDateShort } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Client } from "@/lib/supabase/queries"

type Filter = "all" | "active" | "paused" | "churned"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",     label: "Todos" },
  { key: "active",  label: "Ativos" },
  { key: "paused",  label: "Pausados" },
  { key: "churned", label: "Churned" },
]

export function ClientsTable({ clients }: { clients: Client[] }) {
  const [filter, setFilter] = useState<Filter>("all")

  const visible = filter === "all" ? clients : clients.filter((c) => c.status === filter)

  return (
    <div className="space-y-4">
      {/* Filter tabs — pill style */}
      <div className="flex items-center gap-1">
        {FILTERS.map((f) => {
          const count = f.key === "all" ? clients.length : clients.filter((c) => c.status === f.key).length
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
                isActive
                  ? "bg-foreground text-background font-medium"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "tabular-nums text-[10px]",
                  isActive ? "text-background/70" : "text-muted-foreground/60",
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <EmptyModule
          title={`Nenhum cliente ${filter !== "all" ? filter : ""}`}
          description={
            filter === "all"
              ? "Adicione clientes para acompanhar ticket, status e próxima entrega."
              : `Nenhum cliente com status "${filter}" no momento.`
          }
          icon={<Users className="h-8 w-8" />}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Header */}
          <div className="grid grid-cols-[2fr_1fr_auto_auto_auto] items-center gap-x-6 border-b border-border px-5 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cliente</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
            <p className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">Ticket</p>
            <p className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">Início</p>
            <p className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">Próx. entrega</p>
          </div>

          <motion.div layout className="divide-y divide-border">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((client) => (
                <motion.div
                  key={client.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  className="grid grid-cols-[2fr_1fr_auto_auto_auto] items-center gap-x-6 px-5 py-3.5 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{client.name}</p>
                    {client.email && (
                      <p className="truncate text-[11px] text-muted-foreground">{client.email}</p>
                    )}
                  </div>
                  <StatusPill status={client.status} />
                  <p className="text-right text-sm font-semibold tabular-nums">{formatBRL(client.ticket)}</p>
                  <p className="text-right text-[11px] text-muted-foreground">{formatDateShort(client.started_at)}</p>
                  <p className="text-right text-[11px] text-muted-foreground">
                    {client.next_delivery ? formatDateShort(client.next_delivery) : "—"}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3">
            <p className="text-xs text-muted-foreground">{visible.length} cliente{visible.length !== 1 ? "s" : ""}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              MRR ativo{" "}
              <span className="font-semibold text-foreground">
                {formatBRL(
                  visible.filter((c) => c.status === "active").reduce((s, c) => s + c.ticket, 0),
                )}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
