import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { AgentStatusTile } from "@/components/agents/agent-status-tile"
import { PostsQueue, BriefsQueue, WeeklyPlansQueue } from "@/components/agents/approval-queue"
import { Badge } from "@/components/ui/badge"
import {
  getPendingPosts,
  getPendingBriefs,
  getPendingWeeklyPlans,
  getLastRunPerAgent,
  getAgentLogs,
} from "@/lib/supabase/queries"
import {
  approvePost,
  rejectPost,
  approveBrief,
  approveWeeklyPlan,
  archiveWeeklyPlan,
} from "@/app/(protected)/agentes/actions"
import { formatRelative } from "@/lib/format"
import { StatusPill } from "@/components/dashboard/status-pill"

export const dynamic = "force-dynamic"

const AGENTS = ["ceo", "research", "content", "analytics"] as const

// Pass server actions explicitly — avoids closure issues with client boundaries
const actions = { approvePost, rejectPost, approveBrief, approveWeeklyPlan, archiveWeeklyPlan }

export default async function AgentesPage() {
  const [pendingPosts, pendingBriefs, pendingPlans, lastRuns, recentLogs] = await Promise.all([
    getPendingPosts(),
    getPendingBriefs(),
    getPendingWeeklyPlans(),
    getLastRunPerAgent(),
    getAgentLogs(30),
  ])

  const pendingCount = pendingPosts.length + pendingBriefs.length + pendingPlans.length

  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Fleet"
        title="Time de agentes"
        description="Status, fila de aprovações e histórico de execução."
        actions={
          pendingCount > 0 ? (
            <Badge variant="pending">{pendingCount} pendente{pendingCount !== 1 ? "s" : ""}</Badge>
          ) : undefined
        }
      />

      {/* Agent fleet status */}
      <section>
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status dos agentes</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {AGENTS.map((agent) => (
            <AgentStatusTile key={agent} agent={agent} lastRun={lastRuns[agent] ?? null} />
          ))}
        </div>
      </section>

      {/* Approval queue */}
      <section>
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Fila de aprovação</p>
        <Tabs defaultValue="posts">
          <TabsList>
            <TabsTrigger value="posts">
              Posts
              {pendingPosts.length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-400">
                  {pendingPosts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="briefs">
              Briefs
              {pendingBriefs.length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-400">
                  {pendingBriefs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="planejamento">
              Planejamento
              {pendingPlans.length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-400">
                  {pendingPlans.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            <PostsQueue posts={pendingPosts} actions={actions} />
          </TabsContent>

          <TabsContent value="briefs">
            <BriefsQueue briefs={pendingBriefs} actions={actions} />
          </TabsContent>

          <TabsContent value="planejamento">
            <WeeklyPlansQueue plans={pendingPlans} actions={actions} />
          </TabsContent>

          <TabsContent value="historico">
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {recentLogs.length === 0 ? (
                <p className="px-5 py-10 text-center text-xs text-muted-foreground">Nenhum log registrado ainda.</p>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-3">
                    <StatusPill status={log.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-xs font-medium capitalize">{log.agent}</span>
                        <span className="text-xs text-muted-foreground">{log.action}</span>
                      </div>
                      {log.error && (
                        <p className="mt-0.5 truncate text-[11px] text-red-400">{log.error}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-muted-foreground">{formatRelative(log.created_at)}</p>
                      {log.tokens_used && (
                        <p className="text-[10px] text-muted-foreground/60">{log.tokens_used.toLocaleString("pt-BR")} tok</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}
