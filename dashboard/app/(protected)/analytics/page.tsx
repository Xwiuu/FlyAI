import { ModuleHeader } from "@/components/dashboard/module-header"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { StatusPill } from "@/components/dashboard/status-pill"
import { EmptyModule } from "@/components/dashboard/empty-module"
import { BarChart3 } from "lucide-react"
import {
  getRecentMetrics,
  getLatestMetricByName,
} from "@/lib/supabase/queries"
import { formatRelative, formatDateShort } from "@/lib/format"

export const dynamic = "force-dynamic"

// Simple inline sparkline using SVG — no Recharts dep
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 80
  const h = 24
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-foreground"
      />
    </svg>
  )
}

export default async function AnalyticsPage() {
  const [allMetrics, igFollowers, liFollowers, igEngagement, liEngagement] = await Promise.all([
    getRecentMetrics(40),
    getLatestMetricByName("instagram", "followers"),
    getLatestMetricByName("linkedin", "followers"),
    getLatestMetricByName("instagram", "engagement"),
    getLatestMetricByName("linkedin", "engagement"),
  ])

  // Group metrics by platform+name for sparklines
  const grouped = allMetrics.reduce<Record<string, number[]>>((acc, m) => {
    const key = `${m.platform}·${m.metric_name}`
    if (!acc[key]) acc[key] = []
    acc[key].push(m.value)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Analytics Agent"
        title="Métricas de marketing"
        description="Dados coletados pelo Analytics Agent. Input manual no MVP."
      />

      {/* KPI cards */}
      <section>
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Indicadores</p>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard
            label="Seguidores Instagram"
            value={igFollowers ? igFollowers.value.toLocaleString("pt-BR") : "—"}
            sub={igFollowers ? `Atualizado ${formatRelative(igFollowers.collected_at)}` : "Nenhum dado"}
            delay={0}
          />
          <KpiCard
            label="Seguidores LinkedIn"
            value={liFollowers ? liFollowers.value.toLocaleString("pt-BR") : "—"}
            sub={liFollowers ? `Atualizado ${formatRelative(liFollowers.collected_at)}` : "Nenhum dado"}
            delay={0.05}
          />
          <KpiCard
            label="Engajamento Instagram"
            value={igEngagement ? `${igEngagement.value.toFixed(1)}%` : "—"}
            sub={igEngagement ? `Atualizado ${formatRelative(igEngagement.collected_at)}` : "Nenhum dado"}
            delay={0.1}
          />
          <KpiCard
            label="Engajamento LinkedIn"
            value={liEngagement ? `${liEngagement.value.toFixed(1)}%` : "—"}
            sub={liEngagement ? `Atualizado ${formatRelative(liEngagement.collected_at)}` : "Nenhum dado"}
            delay={0.15}
          />
        </div>
      </section>

      {/* Sparklines por série */}
      {Object.keys(grouped).length > 0 && (
        <section>
          <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Séries temporais</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(grouped).map(([key, values]) => {
              const [platform, metric] = key.split("·")
              const latest = values[0] ?? 0
              return (
                <div key={key} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{platform}</p>
                      <p className="text-xs font-medium capitalize">{metric?.replace(/_/g, " ")}</p>
                    </div>
                    <Sparkline values={[...values].reverse()} />
                  </div>
                  <p className="mt-2 text-xl font-semibold tabular-nums">
                    {latest.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{values.length} leituras</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Tabela de entradas recentes */}
      <section>
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Leituras recentes
        </p>
        {allMetrics.length === 0 ? (
          <EmptyModule
            title="Nenhuma métrica registrada"
            description="O Analytics Agent ainda não coletou dados. Rode o workflow manualmente ou aguarde a execução automática de sexta às 18h."
            icon={<BarChart3 className="h-8 w-8" />}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-x-4 border-b border-border px-5 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plataforma</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Métrica</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Data</p>
            </div>
            <div className="divide-y divide-border">
              {allMetrics.slice(0, 20).map((m) => (
                <div key={m.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-x-4 px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <StatusPill status={m.platform} />
                  </div>
                  <p className="text-xs capitalize text-muted-foreground">{m.metric_name.replace(/_/g, " ")}</p>
                  <p className="text-xs font-medium tabular-nums">{m.value.toLocaleString("pt-BR")}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDateShort(m.collected_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
