import { Users } from "lucide-react"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { EmptyModule } from "@/components/dashboard/empty-module"
import { ClientsKanban } from "@/components/dashboard/clients-kanban"
import { AddClientDialog } from "@/components/dashboard/add-client-dialog"
import { getAllClients } from "@/lib/supabase/queries"
import { formatBRLCompact } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  const clients = await getAllClients()

  const active  = clients.filter((c) => c.status === "active")
  const paused  = clients.filter((c) => c.status === "paused")
  const churned = clients.filter((c) => c.status === "churned")

  const mrrAtivo = active.reduce((s, c) => s + c.ticket, 0)
  const ticketMedio = active.length > 0 ? mrrAtivo / active.length : 0

  // Churn rate = churned / (active + churned), i.e. clientes que já tiveram contrato.
  // Exclui os pausados, que ainda podem voltar a ser ativos.
  const everActive = active.length + churned.length
  const churnRate = everActive > 0 ? Math.round((churned.length / everActive) * 100) : 0

  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Clientes"
        title="Carteira"
        description="Ticket, status, próxima entrega e notas operacionais por cliente."
        actions={<AddClientDialog />}
      />

      {clients.length === 0 ? (
        <EmptyModule
          title="Nenhum cliente cadastrado"
          description="A carteira está vazia. Adicione clientes para acompanhar MRR, entregas e saúde da conta."
          icon={<Users className="h-8 w-8" />}
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard
              label="Clientes ativos"
              value={String(active.length)}
              sub={`${clients.length} total na carteira`}
              trend="up"
              delay={0}
            />
            <KpiCard
              label="MRR ativo"
              value={formatBRLCompact(mrrAtivo)}
              sub="Soma dos tickets ativos"
              trend={mrrAtivo > 0 ? "up" : "neutral"}
              delay={0.05}
            />
            <KpiCard
              label="Ticket médio"
              value={ticketMedio > 0 ? formatBRLCompact(ticketMedio) : "—"}
              sub="Clientes ativos"
              delay={0.1}
            />
            <KpiCard
              label="Churn rate histórico"
              value={`${churnRate}%`}
              sub={`${churned.length} de ${everActive} cliente${everActive !== 1 ? "s" : ""} churned`}
              trend={churnRate > 20 ? "down" : "neutral"}
              delay={0.15}
            />
          </div>

          {/* Kanban — ciclo de vida */}
          <section>
            <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Ciclo de vida
            </p>
            <ClientsKanban clients={clients} />
          </section>
        </>
      )}
    </div>
  )
}
