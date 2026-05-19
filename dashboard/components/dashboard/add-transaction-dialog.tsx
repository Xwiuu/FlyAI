"use client"

import { useState, useTransition } from "react"
import { PlusCircle, Loader2 } from "lucide-react"
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
import { addTransaction } from "@/app/(protected)/financeiro/actions"

interface AddTransactionDialogProps {
  label?: string
}

const today = () => new Date().toISOString().slice(0, 10)

export function AddTransactionDialog({ label = "Adicionar transação" }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"income" | "expense">("income")
  const [date, setDate] = useState(today())

  function resetForm() {
    setDescription("")
    setAmount("")
    setType("income")
    setDate(today())
  }

  function handleOpenChange(next: boolean) {
    if (!isPending) {
      setOpen(next)
      if (!next) resetForm()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedAmount = parseFloat(amount)
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0 || !date) return

    startTransition(async () => {
      const result = await addTransaction({
        description: description.trim(),
        amount: parsedAmount,
        type,
        date,
      })

      if (result.ok) {
        toast({ title: "Lançamento adicionado", description: `${description.trim()} registrado com sucesso.` })
        setOpen(false)
        resetForm()
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
            <DialogDescription>
              Registre uma receita ou despesa manualmente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Mensalidade cliente Acme"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0,00"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === "income" || v === "expense") setType(v)
                }}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isPending}
              />
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
                  "Salvar lançamento"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
