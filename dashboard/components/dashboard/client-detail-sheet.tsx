"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Receipt, Sparkles, ArrowRightLeft } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatBRL, formatDateShort } from "@/lib/format"
import { cn } from "@/lib/utils"
import type {
  Client,
  InvoiceStatus,
  LifecycleStage,
  Transaction,
} from "@/lib/supabase/queries"
import {
  fetchClientInvoices,
  updateClientLifecycle,
} from "@/app/(protected)/clientes/actions"

const STAGE_LABEL: Record<LifecycleStage, string> = {
  onboarding: "Onboarding",
  active: "Ativo",
  at_risk: "Risco de Churn",
  churned: "Encerrado",
}

const STAGE_ACCENT: Record<LifecycleStage, string> = {
  onboarding: "border-emerald-500/40 text-emerald-300",
  active: "border-sky-500/40 text-sky-300",
  at_risk: "border-amber-500/40 text-amber-300",
  churned: "border-zinc-500/40 text-zinc-400",
}

const INVOICE_LABEL: Record<InvoiceStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Atrasado",
}

const INVOICE_ACCENT: Record<InvoiceStatus, string> = {
  paid: "border-emerald-500/40 text-emerald-300",
  pending: "border-amber-500/40 text-amber-300",
  overdue: "border-red-500/40 text-red-300",
}

const STAGES: LifecycleStage[] = ["onboarding", "active", "at_risk", "churned"]

export function ClientDetailSheet({
  client,
  open,
  onOpenChange,
}: {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Transaction[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [movePending, startMove] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!client || !open) {
      setInvoices(null)
      setError(null)
      return
    }
    let alive = true
    setLoading(true)
    fetchClientInvoices(client.id)
      .then((res) => {
        if (!alive) return
        if (res.ok) setInvoices(res.invoices)
        else setError(res.error)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [client, open])

  if (!client) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent />
      </Sheet>
    )
  }

  const stage = (client.lifecycle_stage ?? "active") as LifecycleStage

  function handleMove(target: LifecycleStage) {
    if (!client || target === stage || movePending) return
    startMove(async () => {
      const res = await updateClientLifecycle(client.id, target)
      if (res.ok) {
        onOpenChange(false)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate">{client.name}</SheetTitle>
              {client.email && (
                <SheetDescription className="truncate">{client.email}</SheetDescription>
              )}
            </div>
            <Badge variant="outline" className={cn("shrink-0", STAGE_ACCENT[stage])}>
              {STAGE_LABEL[stage]}
            </Badge>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                MRR atual
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatBRL(client.ticket)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-3">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Tokens MTD
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {client.tokens_used_mtd.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>

          {/* Move stage */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <ArrowRightLeft className="h-3 w-3" /> Mover para
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === stage ? "default" : "outline"}
                  disabled={s === stage || movePending}
                  onClick={() => handleMove(s)}
                  className="h-7 px-2.5 text-[11px]"
                >
                  {STAGE_LABEL[s]}
                </Button>
              ))}
            </div>
          </div>

          {/* Invoices */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <Receipt className="h-3 w-3" /> Histórico de faturamento
            </p>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : invoices && invoices.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-3 border-b border-border bg-muted/30 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>NF</span>
                  <span>Data</span>
                  <span className="text-right">Valor</span>
                  <span className="text-right">Status</span>
                </div>
                <ul className="divide-y divide-border">
                  {invoices.map((inv) => {
                    const status = inv.invoice_status as InvoiceStatus
                    return (
                      <li
                        key={inv.id}
                        className="grid grid-cols-[1.2fr_1fr_1fr_auto] items-center gap-3 px-3 py-2 text-xs"
                      >
                        <span className="truncate font-mono text-[11px]">
                          {inv.invoice_number ?? inv.id.slice(0, 8)}
                        </span>
                        <span className="text-muted-foreground">
                          {formatDateShort(inv.date)}
                        </span>
                        <span className="text-right tabular-nums font-medium">
                          {formatBRL(inv.amount)}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "justify-self-end text-[10px]",
                            INVOICE_ACCENT[status],
                          )}
                        >
                          {INVOICE_LABEL[status]}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                Sem notas fiscais lançadas para este cliente.
              </p>
            )}
          </div>

          {client.notes && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Notas
              </p>
              <p className="whitespace-pre-wrap rounded-lg border border-border bg-card px-3 py-3 text-xs leading-relaxed">
                {client.notes}
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
