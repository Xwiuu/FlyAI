"use client"

import { useMemo, useState, useTransition } from "react"
import { Library, Loader2, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { addInspiration, deleteInspiration } from "@/app/(protected)/agentes/actions"
import { toast } from "@/hooks/use-toast"
import type { Inspiration, InspirationFormat } from "@/lib/supabase/queries"

const FORMATS: { value: InspirationFormat; label: string }[] = [
  { value: "single_post", label: "Único" },
  { value: "carousel", label: "Carrossel" },
  { value: "reels", label: "Reels" },
  { value: "lead_magnet", label: "Iscas" },
]

const FORMAT_LABEL: Record<InspirationFormat, string> = {
  single_post: "Único",
  carousel: "Carrossel",
  reels: "Reels",
  lead_magnet: "Isca",
}

export function InspirationBankGrid({ initial }: { initial: Inspiration[] }) {
  const [isPending, startTransition] = useTransition()
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [filter, setFilter] = useState<InspirationFormat | "all">("all")
  const [draft, setDraft] = useState({
    title: "",
    format: "single_post" as InspirationFormat,
    media_url: "",
    tags: "",
  })

  const filtered = useMemo(
    () => (filter === "all" ? initial : initial.filter((i) => i.format === filter)),
    [initial, filter],
  )

  function handleAdd() {
    if (!draft.title.trim() || !draft.media_url.trim()) {
      toast({
        title: "Preencha os campos",
        description: "Título e URL da mídia são obrigatórios.",
        variant: "destructive",
      })
      return
    }
    const tags = draft.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    startTransition(async () => {
      const res = await addInspiration({
        title: draft.title,
        format: draft.format,
        media_url: draft.media_url,
        category_tags: tags,
      })
      if (!res.ok) {
        toast({ title: "Falha ao adicionar", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Inspiração adicionada", description: draft.title })
      setDraft({ title: "", format: "single_post", media_url: "", tags: "" })
    })
  }

  function handleDelete(id: string, title: string) {
    setPendingDelete(id)
    startTransition(async () => {
      const res = await deleteInspiration(id)
      setPendingDelete(null)
      if (!res.ok) {
        toast({ title: "Falha ao remover", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Removida", description: title })
    })
  }

  return (
    <section className="space-y-6">
      {/* Add form */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Library className="h-4 w-4 text-amber-400" />
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Nova referência
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_1fr_1.5fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="insp-title" className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Título
            </Label>
            <Input
              id="insp-title"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Ex.: Carrossel Linear sobre OS"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="insp-format" className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Formato
            </Label>
            <select
              id="insp-format"
              value={draft.format}
              onChange={(e) =>
                setDraft((d) => ({ ...d, format: e.target.value as InspirationFormat }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value} className="bg-card">
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="insp-url" className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              URL da mídia
            </Label>
            <Input
              id="insp-url"
              value={draft.media_url}
              onChange={(e) => setDraft((d) => ({ ...d, media_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="insp-tags" className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Tags (vírgula)
            </Label>
            <Input
              id="insp-tags"
              value={draft.tags}
              onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
              placeholder="b2b, dark, premium"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAdd}
              disabled={isPending}
              className="h-9 gap-1.5 bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-black hover:from-amber-300 hover:to-amber-500"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Filtrar:</p>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] transition-colors",
            filter === "all"
              ? "border-amber-500/60 bg-amber-500/10 text-amber-200"
              : "border-border text-muted-foreground hover:border-muted-foreground/40",
          )}
        >
          Todos
        </button>
        {FORMATS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] transition-colors",
              filter === f.value
                ? "border-amber-500/60 bg-amber-500/10 text-amber-200"
                : "border-border text-muted-foreground hover:border-muted-foreground/40",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-xs text-muted-foreground">
          Nenhuma referência neste filtro ainda.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((insp) => (
            <article
              key={insp.id}
              className="group overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-amber-500/40"
            >
              <div className="aspect-[4/5] w-full overflow-hidden bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={insp.media_url}
                  alt={insp.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
              </div>
              <div className="space-y-2 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                    {insp.title}
                  </h4>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {FORMAT_LABEL[insp.format]}
                  </Badge>
                </div>
                {insp.category_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {insp.category_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending && pendingDelete === insp.id}
                    onClick={() => handleDelete(insp.id, insp.title)}
                    className="h-7 gap-1.5 text-[11px] text-muted-foreground hover:text-red-300"
                  >
                    {pendingDelete === insp.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Remover
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
