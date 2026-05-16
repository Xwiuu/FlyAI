import { MotionCard } from "@/components/dashboard/motion-card"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  trend?: "up" | "down" | "neutral"
  delay?: number
  className?: string
}

export function KpiCard({ label, value, sub, trend, delay, className }: KpiCardProps) {
  return (
    <MotionCard delay={delay} className={cn("flex flex-col gap-3", className)}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub && (
        <p
          className={cn(
            "text-xs",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-destructive",
            trend === "neutral" || !trend ? "text-muted-foreground" : "",
          )}
        >
          {sub}
        </p>
      )}
    </MotionCard>
  )
}
