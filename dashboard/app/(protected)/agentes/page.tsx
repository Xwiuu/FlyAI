import { Suspense } from "react"
import Link from "next/link"
import type { Route } from "next"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { AgentStatusTile } from "@/components/agents/agent-status-tile"
import { AgentsTabs } from "@/components/agents/agents-tabs"
import { Badge } from "@/components/ui/badge"
import {
  getPendingPosts,
  getPendingBriefs,
  getPendingWeeklyPlans,
  getLastRunPerAgent,
  getAgentLogs,
  getLatestCompletedWeeklyPlanningMeeting,
  getPostsBySourceMeeting,
  inferTeseCentral,
} from "@/lib/supabase/queries"
import {
  approvePost,
  rejectPost,
  approveBrief,
  approveWeeklyPlan,
  archiveWeeklyPlan,
} from "@/app/(protected)/agentes/actions"

export const dynamic = "force-dynamic"

const AGENTS = ["ceo", "research", "content", "analytics"] as const

const actions = { approvePost, rejectPost, approveBrief, approveWeeklyPlan, archiveWeeklyPlan }

export default async function AgentesPage() {
  const [pendingPosts, pendingBriefs, pendingPlans, lastRuns, recentLogs, completedMeeting] =
    await Promise.all([
      getPendingPosts(),
      getPendingBriefs(),
      getPendingWeeklyPlans(),
      getLastRunPerAgent(),
      getAgentLogs(30),
      getLatestCompletedWeeklyPlanningMeeting(),
    ])

  const [completedPosts, tese] = completedMeeting
    ? await Promise.all([
        getPostsBySourceMeeting(completedMeeting.id),
        inferTeseCentral(completedMeeting.id),
      ])
    : [[] as Awaited<ReturnType<typeof getPostsBySourceMeeting>>, null as string | null]

  const pendingCount = pendingPosts.length + pendingBriefs.length + pendingPlans.length

  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Fleet"
        title="Time de agentes"
        description="Status, fila de aprovações e histórico de execução."
        actions={
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <Badge variant="pending">
                {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
              </Badge>
            )}
            <Link
              href={"/agentes/meetings" as Route}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Salas de reunião →
            </Link>
          </div>
        }
      />

      <section>
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Status dos agentes
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {AGENTS.map((agent) => (
            <AgentStatusTile key={agent} agent={agent} lastRun={lastRuns[agent] ?? null} />
          ))}
        </div>
      </section>

      <section>
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Fila de aprovação
        </p>
        <Suspense fallback={null}>
          <AgentsTabs
            pendingPosts={pendingPosts}
            pendingBriefs={pendingBriefs}
            pendingPlans={pendingPlans}
            recentLogs={recentLogs}
            completedMeeting={completedMeeting}
            tese={tese}
            completedPosts={completedPosts}
            actions={actions}
          />
        </Suspense>
      </section>
    </div>
  )
}
