"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, Loader2, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { createOkr } from "@/app/(protected)/okrs/actions"

type KrSource = "manual" | "mrr_income" | "posts_generated" | "retention_rate"

type KrDraft = {
  title: string
  target: string
  unit: string
  source: KrSource
}

const SELECT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

function blankKr(): KrDraft {
  return { title: "", target: "", unit: "un", source: "manual" }
}

function currentQuarterLabel() {
  const now = new Date()
  const q = Math.floor(now.getUTCMonth() / 3) + 1
  return `Q${q} ${now.getUTCFullYear()}`
}

export function AddOkrDialog({ label = "Novo OKR" }: { label?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [objective, setObjective] = useState("")
  const [quarter, setQuarter] = useState(currentQuarterLabel())
  const [krs, setKrs] = useState<KrDraft[]>([blankKr()])

  function resetForm() {
    setObjective("")
    setQuarter(currentQuarterLabel())
    setKrs([blankKr()])
  }

  function handleOpenChange(next: boolean) {
    if (!isPending) {
      setOpen(next)
      if (!next) resetForm()
    }
  }

  function updateKr(idx: number, patch: Partial<KrDraft>) {
    setKrs((prev) => prev.map((kr, i) => (i === idx ? { ...kr, ...patch } : kr)))
  }

  function addKr() {
    setKrs((prev) => [...prev, blankKr()])
  }

  function removeKr(idx: number) {
    setKrs((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!objective.trim()) {
      toast({ title: "Objetivo obrigatório", variant: "destructive" })
      return
    }

    if (!/^Q[1-4]\s+\d{4}$/i.test(quarter.trim())) {
      toast({
        title: "Quarter inválido",
        description: "Use o formato 'Q2 2026'.",
        variant: "destructive",
      })
      return
    }

    const parsedKrs = krs.map((kr) => ({
      title: kr.title.trim(),
      target: parseFloat(kr.target),
      unit: kr.unit.trim(),
      source: kr.source,
    }))

    for (const kr of parsedKrs) {
      if (!kr.title || isNaN(kr.target) || kr.target <= 0 || !kr.unit) {
        toast({
          title: "KR incompleta",
          description: "Cada key result precisa de título, target válido e unidade.",
          variant: "destructive",
        })
        return
      }
    }

    startTransition(async () => {
      const result = await createOkr({
        objective: objective.trim(),
        quarter: quarter.trim(),
        key_results: parsedKrs,
      })

      if (result.ok) {
        toast({ title: "OKR criado", description: objective.trim() })
        setOpen(false)
        resetForm()
        router.refresh()
      } else {
        toast({ title: "Erro ao salvar", description: result.error, variant: "destructive" })
      }
    })
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-2 text-xs"
        onClick={() => setOpen(true)}
      >
        <PlusCircle className="h-3 w-3" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo OKR</DialogTitle>
            <DialogDescription>
              Defina o objetivo, o trimestre e as key results. KRs com fonte automática
              são recalculadas a cada render do dashboard.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
              <div className="space-y-1.5">
                <Label htmlFor="okr-objective">Objetivo</Label>
                <Input
                  id="okr-objective"
                  placeholder="Ex: Consolidar autoridade técnica no Sul"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="okr-quarter">Trimestre</Label>
                <Input
                  id="okr-quarter"
                  placeholder="Q2 2026"
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Key Results</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-[11px]"
                  onClick={addKr}
                  disabled={isPending}
                >
                  <Plus className="h-3 w-3" />
                  Adicionar KR
                </Button>
              </div>

              <div className="space-y-3">
                {krs.map((kr, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_100px_90px_140px_auto]"
                  >
                    <Input
                      placeholder="Título da KR"
                      value={kr.title}
                      onChange={(e) => updateKr(idx, { title: e.target.value })}
                      disabled={isPending}
                    />
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Target"
                      value={kr.target}
                      onChange={(e) => updateKr(idx, { target: e.target.value })}
                      disabled={isPending}
                    />
                    <select
                      value={kr.unit}
                      onChange={(e) => updateKr(idx, { unit: e.target.value })}
                      disabled={isPending}
                      className={SELECT_CLASS}
                      aria-label="Unidade"
                    >
                      <option value="BRL">BRL</option>
                      <option value="%">%</option>
                      <option value="un">un</option>
                    </select>
                    <select
                      value={kr.source}
                      onChange={(e) =>
                        updateKr(idx, { source: e.target.value as KrSource })
                      }
                      disabled={isPending}
                      className={SELECT_CLASS}
                      aria-label="Fonte"
                    >
                      <option value="manual">Manual</option>
                      <option value="mrr_income">MRR (receita)</option>
                      <option value="posts_generated">Posts gerados</option>
                      <option value="retention_rate">Retenção</option>
                    </select>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeKr(idx)}
                      disabled={isPending || krs.length <= 1}
                      aria-label="Remover KR"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Criar OKR"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
