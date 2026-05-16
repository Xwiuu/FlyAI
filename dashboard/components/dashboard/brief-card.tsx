import { renderMarkdown } from "@/lib/markdown"
import { formatDate, formatRelative } from "@/lib/format"
import { StatusPill } from "@/components/dashboard/status-pill"
import { cn } from "@/lib/utils"
import type { Brief } from "@/lib/supabase/queries"

interface BriefCardProps {
  brief: Brief
  className?: string
  preview?: boolean
}

export function BriefCard({ brief, className, preview = false }: BriefCardProps) {
  const html = renderMarkdown(
    preview ? brief.content.slice(0, 800) + (brief.content.length > 800 ? "\n\n…" : "") : brief.content,
  )

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Daily Brief</p>
          <p className="mt-0.5 text-sm font-medium">{formatDate(brief.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={brief.status} />
          <span className="text-xs text-muted-foreground">{formatRelative(brief.created_at)}</span>
        </div>
      </div>

      <div
        className="prose-custom text-foreground"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
