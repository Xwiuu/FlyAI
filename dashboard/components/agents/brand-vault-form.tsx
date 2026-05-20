"use client"

import { useState, useTransition } from "react"
import { Loader2, Palette, Save, Type as TypeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveBrandVault } from "@/app/(protected)/agentes/actions"
import { toast } from "@/hooks/use-toast"
import type { BrandVault } from "@/lib/supabase/queries"

const HEX_RE = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/

function normalizeHex(v: string): string {
  const t = v.trim()
  if (!t) return ""
  return t.startsWith("#") ? t : `#${t}`
}

function ColorPicker({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const safe = HEX_RE.test(value) ? value.slice(0, 7) : "#000000"
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          aria-label={`${label} color picker`}
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent"
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(normalizeHex(e.target.value))}
          placeholder="#000000"
          className="font-mono text-xs"
        />
      </div>
    </div>
  )
}

export function BrandVaultForm({ initial }: { initial: BrandVault | null }) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    id: initial?.id ?? null,
    logo_dark_url: initial?.logo_dark_url ?? "",
    logo_light_url: initial?.logo_light_url ?? "",
    primary_color: initial?.primary_color ?? "#F5C518",
    secondary_color: initial?.secondary_color ?? "#1F2937",
    dark_color: initial?.dark_color ?? "#0A0A0A",
    font_family: initial?.font_family ?? "",
    visual_style_notes: initial?.visual_style_notes ?? "",
  })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      const res = await saveBrandVault({
        id: form.id ?? undefined,
        logo_dark_url: form.logo_dark_url || null,
        logo_light_url: form.logo_light_url || null,
        primary_color: form.primary_color || null,
        secondary_color: form.secondary_color || null,
        dark_color: form.dark_color || null,
        font_family: form.font_family || null,
        visual_style_notes: form.visual_style_notes || null,
      })
      if (!res.ok) {
        toast({ title: "Falha ao salvar", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Identidade salva ✨", description: "Brand Vault atualizado." })
    })
  }

  return (
    <section className="rounded-xl border border-border bg-gradient-to-br from-card to-background/40 p-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Palette className="h-4 w-4 text-amber-400" />
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Cofre da marca
            </p>
          </div>
          <h3 className="text-base font-semibold text-foreground">Identidade visual</h3>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            Fonte única para logos, tokens de cor e tipografia consumidos pelos agentes criativos.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="gap-2 bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-black shadow-amber-500/30 hover:from-amber-300 hover:to-amber-500"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar identidade
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="logo-dark"
              className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Logo dark (URL)
            </Label>
            <Input
              id="logo-dark"
              value={form.logo_dark_url}
              onChange={(e) => update("logo_dark_url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="logo-light"
              className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Logo light (URL)
            </Label>
            <Input
              id="logo-light"
              value={form.logo_light_url}
              onChange={(e) => update("logo_light_url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="font-family"
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              <TypeIcon className="h-3 w-3" />
              Family / fontes
            </Label>
            <Input
              id="font-family"
              value={form.font_family}
              onChange={(e) => update("font_family", e.target.value)}
              placeholder="Inter, IBM Plex Mono"
            />
          </div>
        </div>

        <div className="space-y-4">
          <ColorPicker
            id="primary-color"
            label="Cor primária"
            value={form.primary_color}
            onChange={(v) => update("primary_color", v)}
          />
          <ColorPicker
            id="secondary-color"
            label="Cor secundária"
            value={form.secondary_color}
            onChange={(v) => update("secondary_color", v)}
          />
          <ColorPicker
            id="dark-color"
            label="Cor escura / base"
            value={form.dark_color}
            onChange={(v) => update("dark_color", v)}
          />
        </div>
      </div>

      <div className="mt-6 space-y-1.5">
        <Label
          htmlFor="style-notes"
          className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Diretrizes de estilo visual
        </Label>
        <textarea
          id="style-notes"
          value={form.visual_style_notes}
          onChange={(e) => update("visual_style_notes", e.target.value)}
          rows={5}
          placeholder="Tom técnico, paleta sóbria, sem stock photos genéricas, sempre microcopy em PT-BR..."
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Preview */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/40 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Preview</p>
        <div className="flex items-center gap-1.5">
          {(["primary_color", "secondary_color", "dark_color"] as const).map((k) => (
            <span
              key={k}
              className="h-6 w-6 rounded border border-border"
              style={{ backgroundColor: form[k] || "transparent" }}
              title={form[k] || k}
            />
          ))}
        </div>
        {form.font_family && (
          <span className="text-xs text-muted-foreground" style={{ fontFamily: form.font_family }}>
            {form.font_family}
          </span>
        )}
      </div>
    </section>
  )
}
