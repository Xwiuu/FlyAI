"use client"

import { useOptimistic, useTransition } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { PostApprovalItem, BriefApprovalItem } from "@/components/agents/approval-item"
import { EmptyModule } from "@/components/dashboard/empty-module"
import { CheckSquare } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { Post, Brief } from "@/lib/supabase/queries"
import type { approvePost, rejectPost, approveBrief } from "@/app/(protected)/agentes/actions"

type Actions = {
  approvePost: typeof approvePost
  rejectPost: typeof rejectPost
  approveBrief: typeof approveBrief
}

// ─── Posts Queue ──────────────────────────────────────────────────────────────

export function PostsQueue({ posts, actions }: { posts: Post[]; actions: Actions }) {
  const [optimisticPosts, removePost] = useOptimistic(
    posts,
    (state: Post[], removedId: string) => state.filter((p) => p.id !== removedId),
  )
  const [, startTransition] = useTransition()

  const handleApprove = (id: string) => {
    startTransition(async () => {
      removePost(id)
      const result = await actions.approvePost(id)
      if (!result.ok) {
        toast({ title: "Erro ao aprovar", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Post aprovado", description: "O conteúdo foi aprovado com sucesso." })
      }
    })
  }

  const handleReject = (id: string) => {
    startTransition(async () => {
      removePost(id)
      const result = await actions.rejectPost(id)
      if (!result.ok) {
        toast({ title: "Erro ao rejeitar", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Post rejeitado", description: "O conteúdo foi marcado como rejeitado." })
      }
    })
  }

  if (optimisticPosts.length === 0) {
    return (
      <EmptyModule
        title="Nenhum post pendente"
        description="Todos os posts foram revisados. A fila está limpa."
        icon={<CheckSquare className="h-8 w-8" />}
      />
    )
  }

  return (
    <motion.div layout className="flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {optimisticPosts.map((post) => (
          <PostApprovalItem
            key={post.id}
            post={post}
            onApprove={handleApprove}
            onReject={handleReject}
            isPending={false}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Briefs Queue ─────────────────────────────────────────────────────────────

export function BriefsQueue({ briefs, actions }: { briefs: Brief[]; actions: Actions }) {
  const [optimisticBriefs, removeBrief] = useOptimistic(
    briefs,
    (state: Brief[], removedId: string) => state.filter((b) => b.id !== removedId),
  )
  const [, startTransition] = useTransition()

  const handleApprove = (id: string) => {
    startTransition(async () => {
      removeBrief(id)
      const result = await actions.approveBrief(id)
      if (!result.ok) {
        toast({ title: "Erro ao aprovar brief", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Brief aprovado", description: "O daily brief foi aprovado." })
      }
    })
  }

  if (optimisticBriefs.length === 0) {
    return (
      <EmptyModule
        title="Nenhum brief pendente"
        description="Todos os briefs foram revisados."
        icon={<CheckSquare className="h-8 w-8" />}
      />
    )
  }

  return (
    <motion.div layout className="flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {optimisticBriefs.map((brief) => (
          <BriefApprovalItem
            key={brief.id}
            brief={brief}
            onApprove={handleApprove}
            isPending={false}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
