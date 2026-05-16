import { Badge } from "@/components/ui/badge"
import type { BadgeProps } from "@/components/ui/badge"

const statusMap: Record<string, BadgeProps["variant"]> = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  published: "published",
  draft: "draft",
  success: "success",
  error: "error",
  active: "approved",
  paused: "pending",
  churned: "rejected",
}

const labelMap: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  published: "Publicado",
  draft: "Rascunho",
  success: "Sucesso",
  error: "Erro",
  active: "Ativo",
  paused: "Pausado",
  churned: "Churned",
}

export function StatusPill({ status }: { status: string }) {
  return (
    <Badge variant={statusMap[status] ?? "secondary"}>
      {labelMap[status] ?? status}
    </Badge>
  )
}
