"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/app/(protected)/clientes/actions"

type PaymentMethod = "pix" | "boleto" | "credit_card"
type NfConfig = "automatic" | "manual"
type FirstPaymentStatus = "paid" | "pending" | "overdue"

const SELECT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const TEXTAREA_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"

export function AddClientDialog({ label = "Adicionar cliente" }: { label?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [projectTitle, setProjectTitle] = useState("")
  const [briefing, setBriefing] = useState("")
  const [ticket, setTicket] = useState("")
  const [isRecurrent, setIsRecurrent] = useState(false)
  const [recurringAmount, setRecurringAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix")
  const [nfConfig, setNfConfig] = useState<NfConfig>("automatic")
  const [contractUrl, setContractUrl] = useState("")
  const [firstPaymentStatus, setFirstPaymentStatus] = useState<FirstPaymentStatus>("pending")

  function resetForm() {
    setName("")
    setEmail("")
    setPhone("")
    setProjectTitle("")
    setBriefing("")
    setTicket("")
    setIsRecurrent(false)
    setRecurringAmount("")
    setPaymentMethod("pix")
    setNfConfig("automatic")
    setContractUrl("")
    setFirstPaymentStatus("pending")
  }

  function handleOpenChange(next: boolean) {
    if (!isPending) {
      setOpen(next)
      if (!next) resetForm()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedTicket = parseFloat(ticket)
    if (!name.trim() || !email.trim() || !projectTitle.trim() || isNaN(parsedTicket) || parsedTicket <= 0) {
      toast({
        title: "Dados incompletos",
        description: "Preencha nome, email, título do projeto e ticket válido.",
        variant: "destructive",
      })
      return
    }

    const parsedRecurringAmount = recurringAmount ? parseFloat(recurringAmount) : undefined
    if (isRecurrent && (!parsedRecurringAmount || parsedRecurringAmount <= 0)) {
      toast({
        title: "Valor recorrente obrigatório",
        description: "Informe o valor mensal recorrente.",
        variant: "destructive",
      })
      return
    }

    startTransition(async () => {
      const result = await createClient({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        ticket: parsedTicket,
        project_title: projectTitle.trim(),
        briefing: briefing.trim() || undefined,
        recurring: isRecurrent,
        recurring_amount: isRecurrent ? parsedRecurringAmount : undefined,
        payment_method: paymentMethod,
        nf_config: nfConfig,
        contract_url: contractUrl.trim(),
        first_payment_status: firstPaymentStatus,
      })

      if (result.ok) {
        toast({
          title: "Cliente cadastrado",
          description: `${name.trim()} entrou em Onboarding. NF gerada automaticamente.`,
        })
        setOpen(false)
        resetForm()
        router.refresh()
      } else {
        toast({
          title: "Erro ao salvar",
          description: result.error,
          variant: "destructive",
        })
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
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
            <DialogDescription>
              Cadastre um cliente. Ele entra automaticamente em <b>Onboarding</b> e a
              primeira NF é gerada no ato.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            {/* ── Contato ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="client-name">Nome</Label>
                <Input
                  id="client-name"
                  placeholder="Ex: Acme S.A."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  placeholder="contato@cliente.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="client-phone">Número de celular</Label>
                <Input
                  id="client-phone"
                  type="tel"
                  placeholder="(51) 9 9999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            {/* ── Projeto ───────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label htmlFor="client-project-title">Título do projeto</Label>
              <Input
                id="client-project-title"
                placeholder="Ex: Estratégia de conteúdo + gestão de tráfego"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client-briefing">Briefing do que fazer</Label>
              <textarea
                id="client-briefing"
                placeholder="Descreva o escopo, objetivos e entregáveis do projeto…"
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                rows={4}
                disabled={isPending}
                className={TEXTAREA_CLASS}
              />
            </div>

            {/* ── Financeiro ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="client-ticket">Ticket (R$)</Label>
                <Input
                  id="client-ticket"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client-first-payment">
                  Status do primeiro pagamento
                </Label>
                <select
                  id="client-first-payment"
                  value={firstPaymentStatus}
                  onChange={(e) =>
                    setFirstPaymentStatus(e.target.value as FirstPaymentStatus)
                  }
                  required
                  disabled={isPending}
                  className={SELECT_CLASS}
                >
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                  <option value="overdue">Atrasado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client-payment">Forma de pagamento</Label>
                <select
                  id="client-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  disabled={isPending}
                  className={SELECT_CLASS}
                >
                  <option value="pix">Pix</option>
                  <option value="boleto">Boleto</option>
                  <option value="credit_card">Cartão</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client-nf">Configuração de NF</Label>
                <select
                  id="client-nf"
                  value={nfConfig}
                  onChange={(e) => setNfConfig(e.target.value as NfConfig)}
                  disabled={isPending}
                  className={SELECT_CLASS}
                >
                  <option value="automatic">Automática</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>

            {/* ── Contrato e recorrência ────────────────────────────── */}
            <div className="space-y-1.5">
              <Label htmlFor="client-contract">URL do contrato</Label>
              <Input
                id="client-contract"
                type="url"
                placeholder="https://drive.google.com/…"
                value={contractUrl}
                onChange={(e) => setContractUrl(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="rounded-md border border-border px-3 py-2.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="client-recurring" className="cursor-pointer">
                    Recorrência Mensal
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Renovação automática a cada 30 dias.
                  </p>
                </div>
                <Switch
                  id="client-recurring"
                  checked={isRecurrent}
                  onCheckedChange={(v) => {
                    setIsRecurrent(v)
                    if (!v) setRecurringAmount("")
                  }}
                  disabled={isPending}
                />
              </div>

              {isRecurrent && (
                <div className="space-y-2 animate-in fade-in-50 duration-200">
                  <label
                    htmlFor="client-recurring-amount"
                    className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    Valor Recorrente Mensal (R$)
                  </label>
                  <Input
                    id="client-recurring-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Ex: 3500"
                    value={recurringAmount}
                    onChange={(e) => setRecurringAmount(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
              )}
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
                  "Cadastrar cliente"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
