import { Target } from "lucide-react"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { MotionCard } from "@/components/dashboard/motion-card"
import { Progress } from "@/components/ui/progress"
import { EmptyModule } from "@/components/dashboard/empty-module"
import { getActiveOkrs } from "@/lib/supabase/queries"
import { cn } from "@/lib/utils"
import type { Okr } from "@/lib/supabase/queries"

export const dynamic = "force-dynamic"

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

function KeyResult({
  kr,
}: {
  kr: { title: string; target: number; current: number; unit: string }
}) {
  const pct = kr.target > 0 ? clamp(Math.round((kr.current / kr.target) * 100), 0, 100) : 0
  const isComplete = pct >= 100
  const isBehind = pct < 40

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-sm leading-snug", isComplete && "text-emerald-400")}>{kr.title}</p>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold tabular-nums">
            {kr.current.toLocaleString("pt-BR")}
            <span className="font-normal text-muted-foreground">
              {" "}/{" "}{kr.target.toLocaleString("pt-BR")} {kr.unit}
            </span>
          </p>
          <p
            className={cn(
              "text-[10px] tabular-nums",
              isComplete && "text-emerald-400",
              isBehind && !isComplete && "text-amber-400",
              !isComplete && !isBehind && "text-muted-foreground",
            )}
          >
            {pct}%
          </p>
        </div>
      </div>
      <Progress
        value={pct}
        className={cn(
          "h-1",
          isComplete && "[&>div]:bg-emerald-400",
          isBehind && !isComplete && "[&>div]:bg-amber-400",
        )}
      />
    </div>
  )
}

function OkrCard({ okr, delay }: { okr: Okr; delay: number }) {
  const krs = okr.key_results ?? []
  const avgPct =
    krs.length > 0
      ? Math.round(
          krs.reduce((s, kr) => {
            const pct = kr.target > 0 ? clamp((kr.current / kr.target) * 100, 0, 100) : 0
            return s + pct
          }, 0) / krs.length,
        )
      : 0

  const ringColor =
    avgPct >= 80
      ? "text-emerald-400"
      : avgPct >= 40
      ? "text-amber-400"
      : "text-muted-foreground"

  return (
    <MotionCard delay={delay} hover={false} className="flex flex-col gap-5">
      {/* OKR header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {okr.quarter}
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug">{okr.objective}</p>
        </div>
        {/* Progress ring (simple numeric badge) */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full border border-border",
            ringColor,
          )}
        >
          <p className="text-[11px] font-bold tabular-nums leading-none">{avgPct}</p>
          <p className="text-[8px] text-muted-foreground">%</p>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-border" />

      {/* Key results */}
      {krs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum key result cadastrado.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {krs.map((kr, i) => (
            <KeyResult key={i} kr={kr} />
          ))}
        </div>
      )}
    </MotionCard>
  )
}

export default async function OkrsPage() {
  const okrs = await getActiveOkrs()

  // Group by quarter
  const byQuarter = okrs.reduce<Record<string, Okr[]>>((acc, okr) => {
    if (!acc[okr.quarter]) acc[okr.quarter] = [];
    (acc[okr.quarter] as Okr[]).push(okr)
    return acc
  }, {})

  const quarters = Object.keys(byQuarter).sort().reverse() // most recent first

  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Metas"
        title="OKRs"
        description="Objetivos trimestrais com progresso por key result."
      />

      {okrs.length === 0 ? (
        <EmptyModule
          title="Nenhum OKR cadastrado"
          description="Defina objetivos e key results trimestrais para acompanhar a evolução estratégica da Fly.AI."
          icon={<Target className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-10">
          {quarters.map((quarter) => (
            <section key={quarter}>
              <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {quarter}
              </p>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {(byQuarter[quarter] ?? []).map((okr, i) => (
                  <OkrCard key={okr.id} okr={okr} delay={i * 0.06} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
