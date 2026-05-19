"use client"

import { useState } from "react"
import Link from "next/link"
import type { Route } from "next"
import {
  Target,
  CalendarCheck2,
  Eye,
  Clapperboard,
  Hash,
  ArrowRight,
  Film,
  TrendingDown,
  BarChart2,
  Flame,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormatChip } from "@/components/agents/post-format-chip"
import { formatRelative, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Meeting, Post } from "@/lib/supabase/queries"

// ─── Metadata types ────────────────────────────────────────────────────────────

interface Hook {
  variant: "medo_perda" | "dados_frios" | "ironia_mercado"
  text: string
}

interface PostMeta {
  title?: string
  hooks?: Hook[]
  body?: string | string[]
  visual_direction?: string
  call_to_action?: string
  hashtags?: string[]
  rationale?: string
}

// ─── Hook variant labels ────────────────────────────────────────────────────────

const HOOK_META: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  medo_perda: {
    label: "Medo da Perda",
    icon: TrendingDown,
    className: "border-red-500/20 bg-red-500/[0.04] text-red-300",
  },
  dados_frios: {
    label: "Dados Frios",
    icon: BarChart2,
    className: "border-blue-500/20 bg-blue-500/[0.04] text-blue-300",
  },
  ironia_mercado: {
    label: "Ironia de Mercado",
    icon: Flame,
    className: "border-amber-500/20 bg-amber-500/[0.04] text-amber-300",
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMeta(post: Post): PostMeta {
  return (post.metadata as PostMeta | null | undefined) ?? {}
}

function postTitle(post: Post): string {
  const meta = parseMeta(post)
  if (meta.title && meta.title.trim().length > 0) return meta.title.trim()
  const firstLine = post.content.split("\n").find((l) => l.trim().length > 0) ?? ""
  return firstLine.slice(0, 80) || "Post sem título"
}

// ─── Post Detail Dialog ────────────────────────────────────────────────────────

function PostDetailDialog({
  post,
  open,
  onOpenChange,
}: {
  post: Post | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!post) return null

  const meta = parseMeta(post)
  const title = postTitle(post)
  const hooks = meta.hooks ?? []
  const body = meta.body
  const slides = Array.isArray(body) ? body : body ? [body] : []
  const isCarousel = Array.isArray(meta.body)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <DialogHeader className="mb-5 pr-6">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <FormatChip format={post.type} />
                <Badge variant="pending" className="text-[10px]">
                  {post.status}
                </Badge>
              </div>
              <DialogTitle className="text-base font-semibold leading-snug text-foreground">
                {title}
              </DialogTitle>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatRelative(post.created_at)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* ─── Ganchos ────────────────────────────────────────────────── */}
          {hooks.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Ganchos ({hooks.length})
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {hooks.map((hook, i) => {
                  const hm = HOOK_META[hook.variant] ?? HOOK_META.dados_frios!
                  const Icon = hm.icon
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border px-4 py-3",
                        hm.className,
                      )}
                    >
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                      <div className="min-w-0">
                        <p className="mb-0.5 text-[10px] uppercase tracking-[0.16em] opacity-60">
                          {hm.label}
                        </p>
                        <p className="text-sm leading-relaxed">{hook.text}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ─── Conteúdo / Slides ──────────────────────────────────────── */}
          {slides.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Film className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {isCarousel ? `Slides (${slides.length})` : "Conteúdo"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border">
                {slides.map((slide, i) => (
                  <div key={i} className="px-4 py-3">
                    {isCarousel && (
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
                        Slide {i + 1}
                      </p>
                    )}
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {slide}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Direção Visual ─────────────────────────────────────────── */}
          {meta.visual_direction && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Clapperboard className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Direção Visual
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground italic">
                  {meta.visual_direction}
                </p>
              </div>
            </section>
          )}

          {/* ─── CTA + Hashtags ─────────────────────────────────────────── */}
          {(meta.call_to_action || (meta.hashtags && meta.hashtags.length > 0)) && (
            <section className="rounded-lg border border-border bg-background/40 px-4 py-3">
              {meta.call_to_action && (
                <div className="mb-3 flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div>
                    <p className="mb-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Call to Action
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {meta.call_to_action}
                    </p>
                  </div>
                </div>
              )}
              {meta.hashtags && meta.hashtags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1.5">
                    {meta.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface CompletedPlanningSummaryProps {
  meeting: Meeting
  tese: string | null
  posts: Post[]
}

export function CompletedPlanningSummary({
  meeting,
  tese,
  posts,
}: CompletedPlanningSummaryProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const completedAt = meeting.completed_at ?? meeting.created_at

  return (
    <>
      <section className="rounded-xl border border-border bg-card">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Último planejamento concluído
            </p>
            <h3 className="truncate text-sm font-semibold text-foreground">{meeting.title}</h3>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <CalendarCheck2 className="h-3 w-3" />
              <span>{formatDate(completedAt)}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{formatRelative(completedAt)}</span>
            </div>
          </div>
          <Link
            href={`/agentes/meetings/${meeting.id}` as Route}
            className="text-[11px] text-muted-foreground underline-offset-4 hover:underline"
          >
            Abrir sala →
          </Link>
        </header>

        <div className="space-y-5 px-5 py-5">
          {/* Tese central */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-amber-400" />
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Tese central
              </p>
            </div>
            {tese ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{tese}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tese não detectada no transcript.{" "}
                <Link
                  href={`/agentes/meetings/${meeting.id}` as Route}
                  className="underline underline-offset-4"
                >
                  Consulte a sala da reunião
                </Link>{" "}
                para revisar o roadmap proposto pelo CEO Agent.
              </p>
            )}
          </div>

          {/* Posts gerados */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Posts gerados ({posts.length})
              </p>
            </div>
            {posts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                Esta reunião concluiu sem materializar posts. Verifique o transcript do Content Agent.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {posts.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className="group flex h-full w-full flex-col gap-3 rounded-lg border border-border bg-background/40 p-3 text-left transition-all hover:scale-[1.01] hover:border-primary/50 hover:bg-muted/40 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <FormatChip format={post.type} />
                      <Badge variant="pending">{post.status}</Badge>
                    </div>
                    <h4 className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary/90">
                      {postTitle(post)}
                    </h4>
                    <div className="mt-auto flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">
                        {formatRelative(post.created_at)}
                      </p>
                      <span className="text-[10px] text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100">
                        Revisar →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <PostDetailDialog
        post={selectedPost}
        open={selectedPost !== null}
        onOpenChange={(v) => { if (!v) setSelectedPost(null) }}
      />
    </>
  )
}
