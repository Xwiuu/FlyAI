"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PostsQueue, BriefsQueue, WeeklyPlansQueue } from "@/components/agents/approval-queue"
import { CompletedPlanningSummary } from "@/components/agents/completed-planning-summary"
import { BrandVaultForm } from "@/components/agents/brand-vault-form"
import { InspirationBankGrid } from "@/components/agents/inspiration-bank-grid"
import { StatusPill } from "@/components/dashboard/status-pill"
import { formatRelative } from "@/lib/format"
import type {
  Post,
  Brief,
  WeeklyPlan,
  AgentLog,
  Meeting,
  BrandVault,
  Inspiration,
} from "@/lib/supabase/queries"
import type {
  approvePost,
  rejectPost,
  approveBrief,
  approveWeeklyPlan,
  archiveWeeklyPlan,
} from "@/app/(protected)/agentes/actions"

const VALID_TABS = ["revisao", "brand-vault", "inspiracoes"] as const
type TabValue = (typeof VALID_TABS)[number]

function resolveTab(raw: string | null | undefined): TabValue {
  return VALID_TABS.includes(raw as TabValue) ? (raw as TabValue) : "revisao"
}

type Actions = {
  approvePost: typeof approvePost
  rejectPost: typeof rejectPost
  approveBrief: typeof approveBrief
  approveWeeklyPlan: typeof approveWeeklyPlan
  archiveWeeklyPlan: typeof archiveWeeklyPlan
}

interface AgentsTabsProps {
  pendingPosts: Post[]
  pendingBriefs: Brief[]
  pendingPlans: WeeklyPlan[]
  recentLogs: AgentLog[]
  completedMeeting: Meeting | null
  tese: string | null
  completedPosts: Post[]
  actions: Actions
  brandVault: BrandVault | null
  inspirations: Inspiration[]
}

export function AgentsTabs({
  pendingPosts,
  pendingBriefs,
  pendingPlans,
  recentLogs,
  completedMeeting,
  tese,
  completedPosts,
  actions,
  brandVault,
  inspirations,
}: AgentsTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = resolveTab(searchParams.get("tab"))
  const pendingTotal = pendingPosts.length + pendingBriefs.length + pendingPlans.length

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value: string) => router.push(`/agentes?tab=${value}`)}
      className="w-full"
    >
      <TabsList>
        <TabsTrigger value="revisao">
          Revisão de Conteúdo
          {pendingTotal > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-400">
              {pendingTotal}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="brand-vault">Brand Vault</TabsTrigger>
        <TabsTrigger value="inspiracoes">Banco de Inspirações</TabsTrigger>
      </TabsList>

      <TabsContent value="revisao">
        <div className="flex flex-col gap-8">
          {/* Planejamento + Posts gerados */}
          {completedMeeting && (
            <CompletedPlanningSummary
              meeting={completedMeeting}
              tese={tese}
              posts={completedPosts}
            />
          )}

          <WeeklyPlansQueue plans={pendingPlans} actions={actions} />

          {/* Fila de posts */}
          {pendingPosts.length > 0 && (
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Posts pendentes ({pendingPosts.length})
              </p>
              <PostsQueue posts={pendingPosts} actions={actions} />
            </section>
          )}

          {/* Fila de briefs */}
          {pendingBriefs.length > 0 && (
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Briefs pendentes ({pendingBriefs.length})
              </p>
              <BriefsQueue briefs={pendingBriefs} actions={actions} />
            </section>
          )}

          {/* Histórico de execução */}
          <section>
            <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Histórico recente
            </p>
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {recentLogs.length === 0 ? (
                <p className="px-5 py-10 text-center text-xs text-muted-foreground">
                  Nenhum log registrado ainda.
                </p>
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
                        <p className="text-[10px] text-muted-foreground/60">
                          {log.tokens_used.toLocaleString("pt-BR")} tok
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </TabsContent>

      <TabsContent value="brand-vault">
        <BrandVaultForm initial={brandVault} />
      </TabsContent>

      <TabsContent value="inspiracoes">
        <InspirationBankGrid initial={inspirations} />
      </TabsContent>
    </Tabs>
  )
}
