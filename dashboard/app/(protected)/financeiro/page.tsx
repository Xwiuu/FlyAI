import { TrendingUp, TrendingDown, Landmark } from "lucide-react"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { AddTransactionDialog } from "@/components/dashboard/add-transaction-dialog"
import { EmptyModule } from "@/components/dashboard/empty-module"
import { MotionCard } from "@/components/dashboard/motion-card"
import { getTransactions, getMRRCurrentMonth } from "@/lib/supabase/queries"
import { formatBRL, formatBRLCompact, formatDateShort } from "@/lib/format"
import type { Transaction } from "@/lib/supabase/queries"

export const dynamic = "force-dynamic"

const CATEGORY_LABEL: Record<string, string> = {
  mrr: "MRR",
  tools: "Ferramentas",
  tax: "Impostos",
  other: "Outro",
}

function categoryLabel(cat: string | null) {
  return cat ? (CATEGORY_LABEL[cat] ?? cat) : "—"
}

export default async function FinanceiroPage() {
  const [transactions, mrr] = await Promise.all([
    getTransactions(),
    getMRRCurrentMonth(),
  ])

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0)

  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0)

  const balance = income - expenses
  // Runway = balance / avg monthly burn (last 30 days expenses)
  const monthlyBurn = transactions
    .filter((t) => {
      const d = new Date(t.date)
      const now = new Date()
      const cutoff = new Date(now.getFullYear(), now.getMonth(), 1)
      return t.type === "expense" && d >= cutoff
    })
    .reduce((s, t) => s + t.amount, 0)

  const runwayMonths = monthlyBurn > 0 ? Math.max(0, Math.floor(balance / monthlyBurn)) : null
  const insolvent = monthlyBurn > 0 && balance < 0

  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Financeiro"
        title="Receitas e despesas"
        description="Controle financeiro manual."
        actions={<AddTransactionDialog />}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="MRR"
          value={formatBRLCompact(mrr)}
          sub={mrr === 0 ? "Nenhuma receita MRR este mês" : "Receita recorrente mensal"}
          trend={mrr > 0 ? "up" : "neutral"}
          delay={0}
        />
        <KpiCard
          label="Receitas totais"
          value={formatBRLCompact(income)}
          sub={`${transactions.filter((t) => t.type === "income").length} lançamentos`}
          trend={income > 0 ? "up" : "neutral"}
          delay={0.05}
        />
        <KpiCard
          label="Despesas totais"
          value={formatBRLCompact(expenses)}
          sub={`${transactions.filter((t) => t.type === "expense").length} lançamentos`}
          trend={expenses > 0 ? "down" : "neutral"}
          delay={0.1}
        />
        <KpiCard
          label={insolvent ? "⚠ Runway — saldo negativo" : runwayMonths !== null ? `Runway — ${runwayMonths} meses` : "Runway"}
          value={formatBRLCompact(balance)}
          sub={
            insolvent
              ? "Despesas históricas superam receitas"
              : runwayMonths !== null
              ? `Baseado no burn de ${formatBRLCompact(monthlyBurn)}/mês`
              : "Sem burn registrado este mês"
          }
          trend={insolvent ? "down" : balance >= 0 ? "up" : "down"}
          delay={0.15}
        />
      </div>

      {/* Transactions table */}
      <section>
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Lançamentos
        </p>

        {transactions.length === 0 ? (
          <EmptyModule
            title="Nenhum lançamento registrado"
            description="Adicione transações manualmente para acompanhar MRR, despesas e runway."
            icon={<Landmark className="h-8 w-8" />}
          >
            <AddTransactionDialog label="Adicionar primeiro lançamento" />
          </EmptyModule>
        ) : (
          <MotionCard delay={0.2} hover={false} className="overflow-hidden p-0">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-6 border-b border-border px-5 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Descrição</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Categoria</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo</p>
              <p className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">Valor</p>
              <p className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">Data</p>
            </div>

            <div className="divide-y divide-border">
              {transactions.map((t: Transaction) => {
                const isIncome = t.type === "income"
                return (
                  <div
                    key={t.id}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-6 px-5 py-3.5 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{categoryLabel(t.category)}</p>
                    <div>
                      {isIncome ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          <TrendingUp className="h-2.5 w-2.5" />
                          Receita
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                          <TrendingDown className="h-2.5 w-2.5" />
                          Despesa
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-right text-sm font-semibold tabular-nums ${
                        isIncome ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {isIncome ? "+" : "−"}{formatBRL(t.amount)}
                    </p>
                    <p className="text-right text-[11px] text-muted-foreground">
                      {formatDateShort(t.date)}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Footer total */}
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3">
              <p className="text-xs text-muted-foreground">{transactions.length} lançamentos no total</p>
              <p className={`text-sm font-semibold tabular-nums ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                Saldo {formatBRL(balance)}
              </p>
            </div>
          </MotionCard>
        )}
      </section>
    </div>
  )
}
