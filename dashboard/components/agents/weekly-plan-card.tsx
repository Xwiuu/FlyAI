"use client"

import { forwardRef } from "react"
import { motion } from "framer-motion"
import {
  Check,
  Archive,
  Target,
  Lightbulb,
  AlertTriangle,
  Anchor,
  Orbit,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { WeeklyPlan } from "@/lib/supabase/queries"
import { FormatChip } from "@/components/agents/post-format-chip"

interface WeeklyPlanCardProps {
  weeklyPlan: WeeklyPlan
  onApprove: (id: string) => void
  onArchive: (id: string) => void
  isPending: boolean
}

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  )
}

export const WeeklyPlanCard = forwardRef<HTMLDivElement, WeeklyPlanCardProps>(
  function WeeklyPlanCard({ weeklyPlan, onApprove, onArchive, isPending }, ref) {
  const { plan } = weeklyPlan
  const weekLabel = new Date(weeklyPlan.week_of).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.22, ease: "easeIn" } }}
      className={cn(
        "flex flex-col gap-6 rounded-xl border border-border bg-card p-6 transition-opacity",
        isPending && "opacity-50 pointer-events-none",
      )}
    >
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Research Agent · Planejamento Semanal
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-tight">{plan.theme}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Semana de {weekLabel} · {formatRelative(weeklyPlan.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="pending">{weeklyPlan.status}</Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onArchive(weeklyPlan.id)}
            disabled={isPending}
            className="h-8 gap-1.5 text-xs text-muted-foreground"
          >
            <Archive className="h-3 w-3" />
            Arquivar
          </Button>
          <Button
            size="sm"
            onClick={() => onApprove(weeklyPlan.id)}
            disabled={isPending}
            className="h-8 gap-1.5 text-xs"
          >
            <Check className="h-3 w-3" />
            Aprovar plano
          </Button>
        </div>
      </div>

      {/* ─── Market gaps ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle icon={Target} label={`Gaps de mercado (${plan.market_gaps.length})`} />
        <div className="grid gap-3 sm:grid-cols-2">
          {plan.market_gaps.map((g, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-muted/30 p-4"
            >
              <p className="text-sm font-medium">{g.gap}</p>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{g.evidence}</p>
              <p className="mt-2 border-l-2 border-amber-500/50 pl-2 text-[11px] italic text-muted-foreground">
                Por que agora: {g.why_now}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Angles ──────────────────────────────────────────────────── */}
      <section>
        <SectionTitle icon={Lightbulb} label={`Ângulos retóricos (${plan.angles.length})`} />
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-muted/30">
          {plan.angles.map((a, i) => (
            <div key={i} className="flex flex-col gap-1.5 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{a.angle}</span>
                <FormatChip format={a.best_format} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{a.thesis}</p>
              <p className="flex items-start gap-1.5 text-[11px] text-red-400/80">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                Risco: {a.risk}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Roadmap: pillar + satellites ────────────────────────────── */}
      <section>
        <SectionTitle icon={Orbit} label="Roadmap da semana" />
        <div className="space-y-3">
          {/* Pillar */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Anchor className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400">
                Post Pilar
              </span>
              <FormatChip format={plan.weekly_plan.pillar.format} />
            </div>
            <p className="text-sm font-medium">{plan.weekly_plan.pillar.title}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Ângulo: {plan.weekly_plan.pillar.angle_ref}
            </p>
          </div>

          {/* Satellites */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plan.weekly_plan.satellites.map((s, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <Orbit className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Satélite {i + 1}
                  </span>
                  <FormatChip format={s.format} />
                </div>
                <p className="text-xs font-medium leading-snug">{s.title}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Ângulo: {s.angle_ref}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Narrative risks ─────────────────────────────────────────── */}
      <section>
        <SectionTitle icon={AlertTriangle} label={`Riscos de narrativa (${plan.narrative_risks.length})`} />
        <div className="flex flex-wrap gap-2">
          {plan.narrative_risks.map((risk, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/[0.04] px-3 py-2 text-[11px] text-red-300"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="leading-relaxed">{risk}</span>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  )
})
WeeklyPlanCard.displayName = "WeeklyPlanCard"
