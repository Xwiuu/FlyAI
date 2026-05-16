import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { StatusPill } from "@/components/dashboard/status-pill"
import { Badge } from "@/components/ui/badge"
import { EmptyModule } from "@/components/dashboard/empty-module"
import { MotionCard } from "@/components/dashboard/motion-card"
import { Linkedin, Instagram, AlignLeft, FileText, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getPostsByStatus } from "@/lib/supabase/queries"
import { formatRelative } from "@/lib/format"
import type { Post } from "@/lib/supabase/queries"

export const dynamic = "force-dynamic"

const TYPE_ICON: Record<string, React.ElementType> = {
  linkedin: Linkedin,
  instagram: Instagram,
  carousel: AlignLeft,
}

const TYPE_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  carousel: "Carrossel",
}

const AGENT_LABEL: Record<string, string> = {
  ceo: "CEO Agent",
  content: "Content Agent",
  research: "Research Agent",
  analytics: "Analytics Agent",
}

function PostCard({ post, delay = 0 }: { post: Post; delay?: number }) {
  const Icon = TYPE_ICON[post.type] ?? FileText
  return (
    <MotionCard delay={delay} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-md border border-border bg-muted p-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {TYPE_LABEL[post.type] ?? post.type}
            </p>
            <p className="text-[10px] text-muted-foreground">{AGENT_LABEL[post.agent] ?? post.agent}</p>
          </div>
        </div>
        <StatusPill status={post.status} />
      </div>

      <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">
        {post.content}
      </p>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-[10px] text-muted-foreground">{formatRelative(post.created_at)}</span>
        {post.status === "pending" && (
          <Link
            href="/agentes"
            className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Revisar <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        )}
      </div>
    </MotionCard>
  )
}

function PostGrid({ posts, emptyMessage }: { posts: Post[]; emptyMessage: string }) {
  if (posts.length === 0) {
    return (
      <EmptyModule
        title="Sem conteúdo aqui"
        description={emptyMessage}
        icon={<FileText className="h-8 w-8" />}
      />
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {posts.map((post, i) => (
        <PostCard key={post.id} post={post} delay={i * 0.04} />
      ))}
    </div>
  )
}

export default async function MarketingPage() {
  const [approved, published, draft] = await Promise.all([
    getPostsByStatus("approved"),
    getPostsByStatus("published"),
    getPostsByStatus("draft"),
  ])

  const allApprovedPublished = [...approved, ...published]

  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Marketing"
        title="Biblioteca de conteúdo"
        description="Posts gerados pelos agentes organizados por status."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="approved">{approved.length} aprovados</Badge>
            <Badge variant="published">{published.length} publicados</Badge>
          </div>
        }
      />

      <Tabs defaultValue="biblioteca">
        <TabsList>
          <TabsTrigger value="biblioteca">
            Biblioteca
            {allApprovedPublished.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                {allApprovedPublished.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rascunhos">
            Rascunhos
            {draft.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                {draft.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="plano">Plano semanal</TabsTrigger>
        </TabsList>

        <TabsContent value="biblioteca">
          <PostGrid
            posts={allApprovedPublished}
            emptyMessage="Nenhum post aprovado ou publicado ainda. Aprove conteúdos na fila de agentes."
          />
        </TabsContent>

        <TabsContent value="rascunhos">
          <PostGrid
            posts={draft}
            emptyMessage="Nenhum rascunho disponível."
          />
        </TabsContent>

        <TabsContent value="plano">
          <div className="rounded-xl border border-dashed border-border px-8 py-16 text-center">
            <p className="text-sm font-medium">Plano semanal</p>
            <p className="mt-2 text-xs text-muted-foreground max-w-xs mx-auto">
              O weekly planning workflow ainda não gerou um plano esta semana. Rode manualmente via{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">pnpm tsx agents/workflows/weekly-planning.ts</code>
              .
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
