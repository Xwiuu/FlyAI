import { TrendingUp } from "lucide-react"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { AddDealDialog, DealsKanban } from "@/components/dashboard/deals-kanban"
import { getDeals } from "@/lib/supabase/queries"
import { formatBRLCompact } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function ComercialPage() {
  const deals = await getDeals()

  const openDeals = deals.filter((d) => d.stage !== "won" && d.stage !== "lost")
  const wonDeals = deals.filter((d) => d.stage === "won")
  const proposals = deals.filter((d) => d.stage === "proposal")

  const weightedPipeline = deals
    .filter((d) => d.stage !== "lost")
    .reduce((s, d) => s + d.value * (d.probability / 100), 0)

  const mrrWon = wonDeals.reduce((s, d) => s + d.value, 0)

  const avgTicket =
    proposals.length > 0
      ? proposals.reduce((s, d) => s + d.value, 0) / proposals.length
      : 0

  return (
    <div className="space-y-10">
      <ModuleHeader
        eyebrow="Comercial"
        title="Pipeline"
        description="Leads, calls, propostas e fechamentos. Pipeline ponderado alimenta o MRR projetado no Overview."
        actions={<AddDealDialog />}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Deals em aberto"
          value={String(openDeals.length)}
          sub={`${deals.length} total no pipeline`}
          delay={0}
        />
        <KpiCard
          label="Pipeline ponderado"
          value={formatBRLCompact(weightedPipeline)}
          sub="MRR potencial × probabilidade"
          trend={weightedPipeline > 0 ? "up" : "neutral"}
          delay={0.05}
        />
        <KpiCard
          label="MRR conquistado"
          value={formatBRLCompact(mrrWon)}
          sub={`${wonDeals.length} deal${wonDeals.length !== 1 ? "s" : ""} fechado${wonDeals.length !== 1 ? "s" : ""}`}
          trend={mrrWon > 0 ? "up" : "neutral"}
          delay={0.1}
        />
        <KpiCard
          label="Ticket médio (proposta)"
          value={avgTicket > 0 ? formatBRLCompact(avgTicket) : "—"}
          sub="Média das propostas enviadas"
          delay={0.15}
        />
      </div>

      <section className="rounded-xl border border-border bg-card/50 p-6">
        <p className="mb-5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Kanban
        </p>
        <DealsKanban deals={deals} />
      </section>
    </div>
  )
}
