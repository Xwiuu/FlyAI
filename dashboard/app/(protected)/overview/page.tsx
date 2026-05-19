import { Suspense } from "react"
import Link from "next/link"
import { ArrowRight, FileText, CheckSquare } from "lucide-react"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { Ticker, type TickerItem } from "@/components/dashboard/ticker"
import { BriefCard } from "@/components/dashboard/brief-card"
import { AgentStatusTile } from "@/components/agents/agent-status-tile"
import { EmptyModule } from "@/components/dashboard/empty-module"
import { Skeleton } from "@/components/ui/skeleton"
import { MotionCard } from "@/components/dashboard/motion-card"
import {
  getLatestBrief,
  getActiveClients,
  getWeightedPipeline,
  getPendingPosts,
  getPendingBriefs,
  getPublishedPostsThisWeek,
  getLastRunPerAgent,
  getMRRCurrentMonth,
  getRecentMetrics,
} from "@/lib/supabase/queries"
import { formatBRLCompact, formatTodayLong, formatGreeting } from "@/lib/format"

export const dynamic = "force-dynamic"

const AGENTS = ["ceo", "research", "content", "analytics"] as const

export default async function OverviewPage() {
  const [
    brief,
    clients,
    weightedPipeline,
    pendingPosts,
    pendingBriefs,
    publishedThisWeek,
    lastRuns,
    mrr,
    recentMetrics,
  ] = await Promise.all([
    getLatestBrief(),
    getActiveClients(),
    getWeightedPipeline(),
    getPendingPosts(),
    getPendingBriefs(),
    getPublishedPostsThisWeek(),
    getLastRunPerAgent(),
    getMRRCurrentMonth(),
    getRecentMetrics(12),
  ])

  const pendingTotal = pendingPosts.length + pendingBriefs.length

  // Build ticker items from metrics + agent last runs
  const tickerItems: TickerItem[] = [
    { label: "MRR", value: formatBRLCompact(mrr), status: mrr > 0 ? "ok" : "warn" },
    { label: "Clientes ativos", value: String(clients.length), status: "ok" },
    { label: "Pipeline ponderado", value: formatBRLCompact(weightedPipeline), status: weightedPipeline > 0 ? "ok" : "warn" },
    { label: "Posts publicados esta semana", value: String(publishedThisWeek), status: publishedThisWeek > 0 ? "ok" : "warn" },
    { label: "Aprovações pendentes", value: String(pendingTotal), status: pendingTotal > 0 ? "warn" : "ok" },
    ...recentMetrics.slice(0, 6).map((m): TickerItem => ({
      label: `${m.platform} · ${m.metric_name}`,
      value: m.value.toLocaleString("pt-BR"),
      status: "ok",
    })),
    ...AGENTS.map((agent): TickerItem => {
      const run = lastRuns[agent]
      return {
        label: `${agent} agent`,
        value: run ? run.status : "idle",
        status: run?.status === "success" ? "ok" : run?.status === "error" ? "error" : "warn",
      }
    }),
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs capitalize text-muted-foreground">{formatTodayLong()}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {formatGreeting()}, Fly.AI
        </h1>
      </div>

      {/* Ticker */}
      <Ticker items={tickerItems} />

      {/* KPI Grid */}
      <section>
        <ModuleHeader eyebrow="Visão geral" title="Indicadores" className="mb-4" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard
            label="MRR"
            value={formatBRLCompact(mrr)}
            sub={mrr === 0 ? "Nenhuma transação MRR este mês" : "Receita recorrente mensal"}
            trend={mrr > 0 ? "up" : "neutral"}
            delay={0}
          />
          <KpiCard
            label="Clientes ativos"
            value={String(clients.length)}
            sub={clients.length > 0 ? `Ticket médio ${formatBRLCompact(clients.reduce((s, c) => s + c.ticket, 0) / clients.length)}` : "Nenhum cliente ativo"}
            delay={0.05}
          />
          <KpiCard
            label="Pipeline ponderado"
            value={formatBRLCompact(weightedPipeline)}
            sub="MRR potencial ajustado por probabilidade"
            trend={weightedPipeline > 0 ? "up" : "neutral"}
            delay={0.1}
          />
          <KpiCard
            label="Posts publicados"
            value={String(publishedThisWeek)}
            sub="Últimos 7 dias"
            delay={0.15}
          />
        </div>
      </section>

      {/* Daily Brief */}
      <section>
        <ModuleHeader eyebrow="CEO Agent" title="Daily Brief" className="mb-4" />
        {brief ? (
          <MotionCard delay={0.2} hover={false} className="p-6">
            <BriefCard brief={brief} preview />
          </MotionCard>
        ) : (
          <EmptyModule
            title="Nenhum brief gerado"
            description="O CEO Agent ainda não gerou o brief de hoje. Rodará automaticamente às 07h55."
            icon={<FileText className="h-8 w-8" />}
          />
        )}
      </section>

      {/* Bottom row: Pending + Agent health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pendências */}
        <section>
          <ModuleHeader eyebrow="Fila" title="Aprovações pendentes" className="mb-4" />
          <MotionCard delay={0.25} hover={false} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-semibold tabular-nums">{pendingTotal}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pendingPosts.length} post{pendingPosts.length !== 1 ? "s" : ""} ·{" "}
                  {pendingBriefs.length} brief{pendingBriefs.length !== 1 ? "s" : ""}
                </p>
              </div>
              {pendingTotal > 0 && (
                <Link
                  href="/agentes"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Revisar <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
            {pendingTotal === 0 && (
              <p className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckSquare className="h-3.5 w-3.5" />
                Nenhuma pendência — fila limpa.
              </p>
            )}
          </MotionCard>
        </section>

        {/* Saúde dos agentes */}
        <section>
          <ModuleHeader eyebrow="Fleet" title="Status dos agentes" className="mb-4" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AGENTS.map((agent) => (
              <AgentStatusTile
                key={agent}
                agent={agent}
                lastRun={lastRuns[agent] ?? null}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
