"use client"

import { motion } from "framer-motion"
import { Check, X, FileText, Linkedin, Instagram, AlignLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/dashboard/status-pill"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Post, Brief } from "@/lib/supabase/queries"

const TYPE_ICON: Record<string, React.ElementType> = {
  linkedin: Linkedin,
  instagram: Instagram,
  carousel: AlignLeft,
  brief: FileText,
}

const AGENT_LABEL: Record<string, string> = {
  ceo: "CEO Agent",
  research: "Research Agent",
  content: "Content Agent",
  analytics: "Analytics Agent",
}

// ─── Post item ────────────────────────────────────────────────────────────────

interface PostItemProps {
  post: Post
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isPending: boolean
}

export function PostApprovalItem({ post, onApprove, onReject, isPending }: PostItemProps) {
  const Icon = TYPE_ICON[post.type] ?? FileText
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.22, ease: "easeIn" } }}
      className={cn(
        "rounded-xl border border-border bg-card p-5 transition-opacity",
        isPending && "opacity-50 pointer-events-none",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 shrink-0 rounded-md border border-border bg-muted p-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium">{AGENT_LABEL[post.agent] ?? post.agent}</span>
              <StatusPill status={post.type} />
              <span className="text-[10px] text-muted-foreground">{formatRelative(post.created_at)}</span>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground leading-relaxed">
              {post.content}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(post.id)}
            disabled={isPending}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
          >
            <X className="h-3 w-3" />
            Rejeitar
          </Button>
          <Button
            size="sm"
            onClick={() => onApprove(post.id)}
            disabled={isPending}
            className="h-8 gap-1.5 text-xs"
          >
            <Check className="h-3 w-3" />
            Aprovar
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Brief item ───────────────────────────────────────────────────────────────

interface BriefItemProps {
  brief: Brief
  onApprove: (id: string) => void
  isPending: boolean
}

export function BriefApprovalItem({ brief, onApprove, isPending }: BriefItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.22, ease: "easeIn" } }}
      className={cn(
        "rounded-xl border border-border bg-card p-5 transition-opacity",
        isPending && "opacity-50 pointer-events-none",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 shrink-0 rounded-md border border-border bg-muted p-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium">CEO Agent · Daily Brief</span>
              <StatusPill status={brief.status} />
              <span className="text-[10px] text-muted-foreground">{formatRelative(brief.created_at)}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {new Date(brief.date).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
              {brief.content.slice(0, 200)}…
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => onApprove(brief.id)}
          disabled={isPending}
          className="h-8 shrink-0 gap-1.5 text-xs"
        >
          <Check className="h-3 w-3" />
          Aprovar
        </Button>
      </div>
    </motion.div>
  )
}
