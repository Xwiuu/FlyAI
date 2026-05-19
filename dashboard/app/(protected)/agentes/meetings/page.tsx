import Link from "next/link"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { Badge } from "@/components/ui/badge"
import { listMeetings } from "@/lib/supabase/queries"
import { formatRelative } from "@/lib/format"
import { NewMeetingForm } from "@/components/agents/new-meeting-form"

export const dynamic = "force-dynamic"

const TYPE_LABEL: Record<string, string> = {
  weekly_planning: "Planejamento semanal",
  crisis: "Crise",
  content_review: "Revisão de conteúdo",
  ad_hoc: "Ad-hoc",
}

const STATUS_VARIANT: Record<string, "pending" | "default"> = {
  active: "default",
  awaiting_user: "pending",
  completed: "default",
  archived: "default",
}

export default async function MeetingsListPage() {
  const meetings = await listMeetings()

  const active = meetings.filter(
    (m) => m.status === "active" || m.status === "awaiting_user",
  )
  const finished = meetings.filter(
    (m) => m.status === "completed" || m.status === "archived",
  )

  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Fleet"
        title="Salas de reunião"
        description="Reuniões persistentes entre os agentes e o founder. Substitui invocações por terminal."
        actions={
          <Link
            href="/agentes"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Voltar à fila
          </Link>
        }
      />

      <section>
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Iniciar nova reunião
        </p>
        <NewMeetingForm />
      </section>

      <section>
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Em andamento
        </p>
        {active.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-xs text-muted-foreground">
            Nenhuma reunião ativa.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {active.map((m) => (
              <Link
                key={m.id}
                href={`/agentes/meetings/${m.id}` as never}
                className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {TYPE_LABEL[m.type] ?? m.type} · iniciada{" "}
                    <span suppressHydrationWarning>{formatRelative(m.created_at)}</span>
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[m.status] ?? "default"}>
                  {m.status === "awaiting_user" ? "aguardando você" : m.status}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Recentes
        </p>
        {finished.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-xs text-muted-foreground">
            Sem histórico ainda.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {finished.map((m) => (
              <Link
                key={m.id}
                href={`/agentes/meetings/${m.id}` as never}
                className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {TYPE_LABEL[m.type] ?? m.type} ·{" "}
                    <span suppressHydrationWarning>
                      {formatRelative(m.completed_at ?? m.created_at)}
                    </span>
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {m.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
