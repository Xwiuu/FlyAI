import Link from "next/link"
import type { Route } from "next"
import { notFound } from "next/navigation"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { Badge } from "@/components/ui/badge"
import { getMeeting, getMeetingMessages } from "@/lib/supabase/queries"
import { MeetingRoom } from "@/components/agents/meeting-room"

export const dynamic = "force-dynamic"

const TYPE_LABEL: Record<string, string> = {
  weekly_planning: "Planejamento semanal",
  crisis: "Crise",
  content_review: "Revisão de conteúdo",
  ad_hoc: "Ad-hoc",
}

export default async function MeetingDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [meeting, messages] = await Promise.all([
    getMeeting(params.id),
    getMeetingMessages(params.id),
  ])

  if (!meeting) notFound()

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow={TYPE_LABEL[meeting.type] ?? meeting.type}
        title={meeting.title}
        description={`Reunião ${meeting.status}.`}
        actions={
          <div className="flex items-center gap-3">
            <Badge
              variant={meeting.status === "awaiting_user" ? "pending" : "default"}
            >
              {meeting.status === "awaiting_user" ? "aguardando você" : meeting.status}
            </Badge>
            <Link
              href={"/agentes/meetings" as Route}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              ← Todas
            </Link>
          </div>
        }
      />

      <MeetingRoom meeting={meeting} initialMessages={messages} />
    </div>
  )
}
