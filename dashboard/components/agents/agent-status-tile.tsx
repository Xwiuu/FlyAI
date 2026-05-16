import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/format"
import type { AgentLog } from "@/lib/supabase/queries"

const AGENT_LABELS: Record<string, string> = {
  ceo: "CEO Agent",
  research: "Research Agent",
  content: "Content Agent",
  analytics: "Analytics Agent",
}

interface AgentStatusTileProps {
  agent: string
  lastRun: AgentLog | null
  className?: string
}

export function AgentStatusTile({ agent, lastRun, className }: AgentStatusTileProps) {
  const status = lastRun?.status ?? "never"
  const isOk = status === "success"
  const isError = status === "error"
  const isPending = status === "pending"

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border bg-card p-4",
        className,
      )}
    >
      <span
        className={cn(
          "mt-0.5 h-2 w-2 shrink-0 rounded-full",
          isOk && "bg-emerald-400",
          isError && "bg-red-400",
          isPending && "bg-amber-400 animate-pulse",
          status === "never" && "bg-muted-foreground/30",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{AGENT_LABELS[agent] ?? agent}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {lastRun
            ? `${lastRun.action} · ${formatRelative(lastRun.created_at)}`
            : "Nenhuma execução registrada"}
        </p>
        {lastRun?.tokens_used && (
          <p className="mt-0.5 text-[10px] text-muted-foreground/60">
            {lastRun.tokens_used.toLocaleString()} tokens
            {lastRun.duration_ms ? ` · ${(lastRun.duration_ms / 1000).toFixed(1)}s` : ""}
          </p>
        )}
      </div>
    </div>
  )
}
