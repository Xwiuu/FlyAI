import { TrendingUp, Phone, FileText, Trophy, XCircle } from "lucide-react"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { EmptyModule } from "@/components/dashboard/empty-module"
import { Progress } from "@/components/ui/progress"
import { getPipeline, getWeightedPipeline } from "@/lib/supabase/queries"
import { formatBRLCompact, formatBRL } from "@/lib/format"
import type { PipelineItem } from "@/lib/supabase/queries"

export const dynamic = "force-dynamic"

const STAGES = [
  { key: "lead",           label: "Leads",            icon: TrendingUp,  color: "text-muted-foreground" },
  { key: "call_scheduled", label: "Call agendada",    icon: Phone,       color: "text-amber-400" },
  { key: "proposal",       label: "Proposta enviada", icon: FileText,    color: "text-blue-400" },
  { key: "closed_won",     label: "Fechado",          icon: Trophy,      color: "text-emerald-400" },
  { key: "closed_lost",    label: "Perdido",          icon: XCircle,     color: "text-muted-foreground/50" },
] as const

function PipelineCard({ item }: { item: PipelineItem }) {
  const prob = item.win_probability ?? 0
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/20">
      <div className="mb-3">
        <p className="text-sm font-medium leading-snug">{item.name}</p>
        {item.company && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{item.company}</p>
        )}
      </div>

      {item.estimated_ticket !== null && (
        <p className="mb-3 text-xs font-semibold tabular-nums text-foreground">
          {formatBRL(item.estimated_ticket)}
          <span className="ml-1 font-normal text-muted-foreground">/mês</span>
        </p>
      )}

      {/* Win probability bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">Probabilidade</p>
          <p className="text-[10px] font-medium tabular-nums">{prob}%</p>
        </div>
        <Progress value={prob} className="h-0.5" />
      </div>

      {item.email && (
        <p className="mt-3 truncate text-[10px] text-muted-foreground">{item.email}</p>
      )}
    </div>
  )
}

function KanbanColumn({
  stage,
  items,
}: {
  stage: (typeof STAGES)[number]
  items: PipelineItem[]
}) {
  const Icon = stage.icon
  const columnTotal = items.reduce((s, i) => s + (i.estimated_ticket ?? 0), 0)

  return (
    <div className="flex w-64 shrink-0 flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${stage.color}`} />
          <p className="text-xs font-medium">{stage.label}</p>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
            {items.length}
          </span>
        </div>
        {columnTotal > 0 && (
          <p className="text-[10px] text-muted-foreground tabular-nums">{formatBRLCompact(columnTotal)}</p>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
            <p className="text-[11px] text-muted-foreground">Nenhum lead aqui</p>
          </div>
        ) : (
          items.map((item) => <PipelineCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}

export default async function ComercialPage() {
  const [pipeline, weightedPipeline] = await Promise.all([getPipeline(), getWeightedPipeline()])

  const byStage = STAGES.reduce<Record<string, PipelineItem[]>>((acc, s) => {
    acc[s.key] = pipeline.filter((p) => p.stage === s.key)
    return acc
  }, {} as Record<string, PipelineItem[]>)

  const openDeals = pipeline.filter(
    (p) => p.stage !== "closed_won" && p.stage !== "closed_lost",
  )
  const wonDeals = byStage["closed_won"] ?? []
  const mrrWon = wonDeals.reduce((s, p) => s + (p.estimated_ticket ?? 0), 0)

  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Comercial"
        title="Pipeline"
        description="Leads, calls, propostas e fechamentos. Pipeline ponderado alimenta o MRR projetado no Overview."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Deals em aberto"
          value={String(openDeals.length)}
          sub={`${pipeline.length} total no pipeline`}
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
          value={
            (byStage["proposal"]?.length ?? 0) > 0
              ? formatBRLCompact(
                  (byStage["proposal"] ?? []).reduce((s, p) => s + (p.estimated_ticket ?? 0), 0) /
                    (byStage["proposal"]?.length ?? 1),
                )
              : "—"
          }
          sub="Média das propostas enviadas"
          delay={0.15}
        />
      </div>

      {/* Kanban */}
      {pipeline.length === 0 ? (
        <EmptyModule
          title="Pipeline vazio"
          description="Adicione leads e oportunidades para acompanhar o progresso comercial e calcular o MRR ponderado."
          icon={<TrendingUp className="h-8 w-8" />}
        />
      ) : (
        <section>
          <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Kanban
          </p>
          {/* Horizontal scroll scoped to this section */}
          <div className="-mx-10 overflow-x-auto px-10 pb-4">
            <div className="flex gap-4" style={{ minWidth: "max-content" }}>
              {STAGES.map((stage) => (
                <KanbanColumn
                  key={stage.key}
                  stage={stage}
                  items={byStage[stage.key] ?? []}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
