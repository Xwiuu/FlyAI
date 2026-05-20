"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  TrendingUp,
  Phone,
  FileText,
  Trophy,
  XCircle,
  Loader2,
  Trash2,
  ChevronRight,
  PlusCircle,
  User,
  Mail,
  PhoneCall,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { formatBRL, formatBRLCompact } from "@/lib/format"
import type { Deal, DealStage } from "@/lib/supabase/queries"
import {
  createDeal,
  deleteDeal,
  materializeAsClient,
  updateDealStage,
} from "@/app/(protected)/comercial/actions"

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES: Array<{
  key: DealStage
  label: string
  icon: React.ElementType
  color: string
  bg: string
}> = [
  { key: "lead",     label: "Leads",    icon: TrendingUp, color: "text-muted-foreground",    bg: "bg-muted/30" },
  { key: "call",     label: "Call",     icon: Phone,      color: "text-amber-400",           bg: "bg-amber-950/20" },
  { key: "proposal", label: "Proposta", icon: FileText,   color: "text-blue-400",            bg: "bg-blue-950/20" },
  { key: "won",      label: "Fechado",  icon: Trophy,     color: "text-emerald-400",         bg: "bg-emerald-950/20" },
  { key: "lost",     label: "Perdido",  icon: XCircle,    color: "text-muted-foreground/50", bg: "bg-muted/10" },
]

const STAGE_MAP = Object.fromEntries(
  STAGES.map((s) => [s.key, s]),
) as Record<DealStage, (typeof STAGES)[number]>

const SELECT_CLS =
  "flex h-10 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-2.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
const TEXTAREA_CLS =
  "w-full rounded-md border border-input bg-transparent px-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"

// ─── AddDealDialog ─────────────────────────────────────────────────────────────

export function AddDealDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [value, setValue] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  function reset() {
    setTitle("")
    setValue("")
    setContactName("")
    setContactEmail("")
    setContactPhone("")
  }

  function handleOpenChange(next: boolean) {
    if (!isPending) {
      setOpen(next)
      if (!next) reset()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" })
      return
    }
    startTransition(async () => {
      const result = await createDeal({
        title: title.trim(),
        value: parseFloat(value) || 0,
        probability: 10,
        stage: "lead",
        contact_name: contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
      })
      if (result.ok) {
        toast({ title: "Lead adicionado ao pipeline" })
        setOpen(false)
        reset()
        router.refresh()
      } else {
        toast({ title: "Erro ao criar lead", description: result.error, variant: "destructive" })
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <PlusCircle className="h-3.5 w-3.5" />
        Novo Lead
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
            <DialogDescription>Injete uma oportunidade no topo do funil</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-2 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="dl-title">Título *</Label>
              <Input
                id="dl-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Implantação de IA — ABC Ltda"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dl-value">Valor estimado (R$)</Label>
              <Input
                id="dl-value"
                type="number"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="8000"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dl-contact">Contato</Label>
              <Input
                id="dl-contact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nome do decisor"
                disabled={isPending}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dl-email">Email</Label>
                <Input
                  id="dl-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dl-phone">Telefone</Label>
                <Input
                  id="dl-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(11) 9xxxx-xxxx"
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Adicionar Lead"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── DealCard ──────────────────────────────────────────────────────────────────

function DealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="line-clamp-2 text-sm font-medium leading-snug">{deal.title}</p>
      {deal.contact_name && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{deal.contact_name}</p>
      )}
      {deal.value > 0 && (
        <p className="mt-2 text-xs font-semibold tabular-nums">
          {formatBRL(deal.value)}
          <span className="ml-1 font-normal text-muted-foreground">/mês</span>
        </p>
      )}
      <div className="mt-2 space-y-0.5">
        <div className="flex justify-between">
          <p className="text-[10px] text-muted-foreground">Prob.</p>
          <p className="text-[10px] font-medium tabular-nums">{deal.probability}%</p>
        </div>
        <Progress value={deal.probability} className="h-0.5" />
      </div>
    </button>
  )
}

// ─── KanbanColumn ──────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  deals,
  onCardClick,
}: {
  stage: (typeof STAGES)[number]
  deals: Deal[]
  onCardClick: (deal: Deal) => void
}) {
  const Icon = stage.icon
  const total = deals.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex w-64 shrink-0 flex-col gap-3">
      <div className={cn("flex items-center justify-between rounded-lg px-2.5 py-1.5", stage.bg)}>
        <div className="flex items-center gap-2">
          <Icon className={cn("h-3.5 w-3.5", stage.color)} />
          <p className="text-xs font-medium">{stage.label}</p>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
            {deals.length}
          </span>
        </div>
        {total > 0 && (
          <p className="text-[10px] tabular-nums text-muted-foreground">{formatBRLCompact(total)}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {deals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-[11px] text-muted-foreground">Nenhum deal aqui</p>
          </div>
        ) : (
          deals.map((d) => (
            <DealCard key={d.id} deal={d} onClick={() => onCardClick(d)} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── MaterializeDialog ─────────────────────────────────────────────────────────

function MaterializeDialog({
  deal,
  open,
  onClose,
}: {
  deal: Deal
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState(deal.contact_email ?? "")
  const [projectTitle, setProjectTitle] = useState(deal.title)
  const [briefing, setBriefing] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "boleto" | "credit_card">("pix")
  const [nfConfig, setNfConfig] = useState<"automatic" | "manual">("automatic")
  const [firstPaymentStatus, setFirstPaymentStatus] = useState<"paid" | "pending" | "overdue">("pending")
  const [recurring, setRecurring] = useState(true)
  const [recurringAmount, setRecurringAmount] = useState(String(deal.value || ""))
  const [contractUrl, setContractUrl] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      toast({ title: "Email obrigatório", variant: "destructive" })
      return
    }
    if (!projectTitle.trim()) {
      toast({ title: "Título do projeto obrigatório", variant: "destructive" })
      return
    }
    startTransition(async () => {
      const result = await materializeAsClient(deal.id, {
        email: email.trim(),
        project_title: projectTitle.trim(),
        briefing: briefing.trim() || undefined,
        payment_method: paymentMethod,
        nf_config: nfConfig,
        first_payment_status: firstPaymentStatus,
        recurring,
        recurring_amount: recurring ? parseFloat(recurringAmount) || undefined : undefined,
        contract_url: contractUrl.trim() || undefined,
      })
      if (result.ok) {
        toast({
          title: "Cliente materializado!",
          description: "Deal fechado e cliente criado com invoice automática.",
        })
        onClose()
        router.refresh()
      } else {
        toast({ title: "Erro ao materializar", description: result.error, variant: "destructive" })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!isPending && !v) onClose() }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-400" />
            Materializar como Cliente
          </DialogTitle>
          <DialogDescription>
            {deal.contact_name ? `${deal.contact_name} · ` : ""}
            {deal.value > 0 ? `${formatBRL(deal.value)}/mês` : deal.title}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="mat-email">Email do cliente *</Label>
            <Input
              id="mat-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@empresa.com"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mat-project">Título do projeto *</Label>
            <Input
              id="mat-project"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="Implantação de IA — Fluxo de Vendas"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mat-briefing">Briefing</Label>
            <textarea
              id="mat-briefing"
              className={TEXTAREA_CLS}
              rows={3}
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              placeholder="Contexto do projeto, objetivos, entregas…"
              disabled={isPending}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pagamento</Label>
              <select
                className={SELECT_CLS}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                disabled={isPending}
              >
                <option value="pix">Pix</option>
                <option value="boleto">Boleto</option>
                <option value="credit_card">Cartão</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nota Fiscal</Label>
              <select
                className={SELECT_CLS}
                value={nfConfig}
                onChange={(e) => setNfConfig(e.target.value as typeof nfConfig)}
                disabled={isPending}
              >
                <option value="automatic">Automática</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Primeira parcela</Label>
            <select
              className={SELECT_CLS}
              value={firstPaymentStatus}
              onChange={(e) => setFirstPaymentStatus(e.target.value as typeof firstPaymentStatus)}
              disabled={isPending}
            >
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="overdue">Atrasado</option>
            </select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Contrato recorrente</p>
              <p className="text-[11px] text-muted-foreground">Gera NF mensal automaticamente</p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} disabled={isPending} />
          </div>
          {recurring && (
            <div className="space-y-2">
              <Label htmlFor="mat-recurring">Valor recorrente mensal (R$)</Label>
              <Input
                id="mat-recurring"
                type="number"
                min={0}
                value={recurringAmount}
                onChange={(e) => setRecurringAmount(e.target.value)}
                disabled={isPending}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="mat-contract">URL do contrato</Label>
            <Input
              id="mat-contract"
              value={contractUrl}
              onChange={(e) => setContractUrl(e.target.value)}
              placeholder="https://notion.so/contrato-..."
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Criar Cliente"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── DealDetailSheet ──────────────────────────────────────────────────────────

function DealDetailSheet({
  deal,
  open,
  onClose,
}: {
  deal: Deal
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [materializeOpen, setMaterializeOpen] = useState(false)

  function handleStageChange(stage: DealStage) {
    if (stage === deal.stage) return
    startTransition(async () => {
      const result = await updateDealStage(deal.id, stage)
      if (!result.ok) {
        toast({ title: "Erro ao atualizar estágio", description: result.error, variant: "destructive" })
      } else {
        router.refresh()
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDeal(deal.id)
      if (result.ok) {
        toast({ title: "Deal removido" })
        onClose()
        router.refresh()
      } else {
        toast({ title: "Erro ao remover deal", description: result.error, variant: "destructive" })
      }
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v: boolean) => { if (!v && !isPending) onClose() }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="pr-4 leading-snug">{deal.title}</SheetTitle>
            {deal.value > 0 && (
              <SheetDescription className="text-base font-semibold text-foreground">
                {formatBRL(deal.value)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/mês</span>
              </SheetDescription>
            )}
          </SheetHeader>

          <SheetBody className="space-y-6">
            {/* Stage picker */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Estágio
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((s) => {
                  const Icon = s.icon
                  const isActive = s.key === deal.stage
                  return (
                    <button
                      key={s.key}
                      onClick={() => handleStageChange(s.key)}
                      disabled={isPending}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
                        isActive
                          ? "border-transparent bg-foreground text-background"
                          : "border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Contact */}
            {(deal.contact_name || deal.contact_email || deal.contact_phone) && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Contato
                </p>
                <div className="space-y-1.5">
                  {deal.contact_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <p className="text-sm">{deal.contact_name}</p>
                    </div>
                  )}
                  {deal.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{deal.contact_email}</p>
                    </div>
                  )}
                  {deal.contact_phone && (
                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{deal.contact_phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Probability */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Probabilidade
                </p>
                <p className="text-[10px] font-medium tabular-nums">{deal.probability}%</p>
              </div>
              <Progress value={deal.probability} className="h-1" />
            </div>

            {/* Notes */}
            {deal.notes && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Notas
                </p>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{deal.notes}</p>
              </div>
            )}

            {/* Materializar — only when won */}
            {deal.stage === "won" && (
              <>
                <Separator />
                <button
                  onClick={() => setMaterializeOpen(true)}
                  disabled={isPending}
                  className="flex w-full items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-4 py-3.5 text-left transition-colors hover:bg-emerald-950/30 disabled:opacity-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">
                      Materializar como Cliente
                    </p>
                    <p className="text-[11px] text-emerald-400/60">
                      Criar conta no CRM com os dados deste deal
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-emerald-400" />
                </button>
              </>
            )}

            {/* Delete */}
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Excluir deal
                  </>
                )}
              </Button>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>

      {materializeOpen && (
        <MaterializeDialog
          deal={deal}
          open={materializeOpen}
          onClose={() => setMaterializeOpen(false)}
        />
      )}
    </>
  )
}

// ─── DealsKanban ──────────────────────────────────────────────────────────────

export function DealsKanban({ deals }: { deals: Deal[] }) {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const byStage = STAGES.reduce<Record<string, Deal[]>>((acc, s) => {
    acc[s.key] = deals.filter((d) => d.stage === s.key)
    return acc
  }, {})

  function handleCardClick(deal: Deal) {
    setSelectedDeal(deal)
    setSheetOpen(true)
  }

  function handleSheetClose() {
    setSheetOpen(false)
    setTimeout(() => setSelectedDeal(null), 300)
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
        <TrendingUp className="mb-3 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Pipeline vazio</p>
        <p className="mt-1 text-[12px] text-muted-foreground/60">
          Adicione leads para calcular o MRR ponderado e acompanhar o funil
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="-mx-10 overflow-x-auto px-10 pb-4">
        <div className="flex gap-4" style={{ minWidth: "max-content" }}>
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              deals={byStage[stage.key] ?? []}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      </div>

      {selectedDeal && (
        <DealDetailSheet
          deal={selectedDeal}
          open={sheetOpen}
          onClose={handleSheetClose}
        />
      )}
    </>
  )
}
