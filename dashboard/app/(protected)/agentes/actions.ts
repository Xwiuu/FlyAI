"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ApproveResult = { ok: true } | { ok: false; error: string }

async function requireAuthorized() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: authorized } = await supabase
    .from("authorized_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!authorized) return null
  return user
}

export async function approvePost(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase
    .from("posts")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", id)

  if (error) {
    console.error("[approvePost] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  revalidatePath("/overview")
  return { ok: true }
}

export async function rejectPost(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase
    .from("posts")
    .update({ status: "rejected" })
    .eq("id", id)

  if (error) {
    console.error("[rejectPost] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  revalidatePath("/overview")
  return { ok: true }
}

export async function approveBrief(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase
    .from("briefs")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("[approveBrief] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  revalidatePath("/overview")
  return { ok: true }
}

export async function approveWeeklyPlan(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase
    .from("weekly_plans")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("[approveWeeklyPlan] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  return { ok: true }
}

export async function archiveWeeklyPlan(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase
    .from("weekly_plans")
    .update({ status: "archived" })
    .eq("id", id)

  if (error) {
    console.error("[archiveWeeklyPlan] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  return { ok: true }
}

// ─── Creative Suite — Approval Gates ──────────────────────────────────────────

export async function approveAsArtDirector(postId: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase
    .from("posts")
    .update({ art_director_approved: true })
    .eq("id", postId)

  if (error) {
    console.error("[approveAsArtDirector] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  return { ok: true }
}

export async function approveAsCEO(postId: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase
    .from("posts")
    .update({ ceo_approved: true })
    .eq("id", postId)

  if (error) {
    console.error("[approveAsCEO] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  return { ok: true }
}

export async function williamCheck(postId: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { data: post, error: fetchError } = await supabase
    .from("posts")
    .select("art_director_approved, ceo_approved")
    .eq("id", postId)
    .maybeSingle()

  if (fetchError) {
    console.error("[williamCheck] fetch error:", fetchError.message)
    return { ok: false, error: fetchError.message }
  }
  if (!post) return { ok: false, error: "Post não encontrado." }
  if (!post.art_director_approved || !post.ceo_approved) {
    return { ok: false, error: "Faltam aprovações do Diretor de Arte e/ou CEO." }
  }

  const { error } = await supabase
    .from("posts")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", postId)

  if (error) {
    console.error("[williamCheck] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  revalidatePath("/overview")
  return { ok: true }
}

// Mock images: abstract data visualizations, minimalist dark compositions, network graphs.
// No planets, no generic stock photography.
const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1080&q=80",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&q=80",
  "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1080&q=80",
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1080&q=80",
  "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1080&q=80",
  "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1080&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1080&q=80",
  "https://images.unsplash.com/photo-1580927752452-89d86da3fa0a?w=1080&q=80",
]

const PROMPT_AGENT_SYSTEM = `You are a Senior Visual Prompt Engineer specializing in Dark Premium Branding for Tech/SaaS companies.
Your ONLY output is a technical image prompt in English, ready to be sent directly to Imagen 3.

FORBIDDEN CONCEPTS: planets, Earth from space, server racks, circuit boards, humanoid robots, digital brains, globes with network lines, abstract purple/blue particle waves.

REQUIRED TRANSLATION — map abstract ideas to graphic design elements:
- "orchestration" → minimalist node-graph schematic, procedural network topology
- "automation" → clean geometric flow diagram, abstract pipeline visualization
- "agents" → abstract process graph, modular system architecture art
- "data" → minimalist data table fragment, precision chart element
- "intelligence" → sparse data constellation, refined signal waveform

MANDATORY AESTHETIC: matte black #0A0A0A background, single emerald (#00D084) or amber (#F5C518) accent glow, cinematographic chiaroscuro lighting, single focal point, editorial negative space. Style: Monocle / Bloomberg Businessweek / Linear.app.

OUTPUT: Return ONLY the English image prompt. 60–120 words. No markdown, no preamble.`

async function generateRefinedPromptDashboard(
  postContent: string,
  postTitle: string,
  postType: string,
  visualDirection: string,
  brandVault: {
    primary_color: string | null
    secondary_color: string | null
    dark_color: string | null
    visual_style_notes: string | null
  } | null,
  inspirationTags: string[],
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return fallbackPrompt(postTitle, postType)

  const brandSection = brandVault
    ? [
        brandVault.primary_color && `Primary accent: ${brandVault.primary_color}`,
        brandVault.secondary_color && `Secondary: ${brandVault.secondary_color}`,
        brandVault.dark_color && `Background: ${brandVault.dark_color}`,
        brandVault.visual_style_notes && `Style: ${brandVault.visual_style_notes}`,
      ]
        .filter(Boolean)
        .join(". ")
    : "Amber #F5C518 on matte black #0A0A0A. Dark premium corporate."

  const patternsLine =
    inspirationTags.length > 0
      ? `Curated aesthetic patterns: ${inspirationTags.join(", ")}.`
      : ""

  const userMessage = [
    `── POST TO VISUALIZE (format: ${postType}) ──`,
    `Title: ${postTitle}`,
    `Art direction: ${visualDirection}`,
    "",
    postContent.slice(0, 600),
    "",
    `Brand: ${brandSection}`,
    patternsLine,
    "",
    "Identify the single core concept and translate it into a powerful visual metaphor using real graphic design elements. Output ONLY the Imagen 3 prompt.",
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: PROMPT_AGENT_SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    )

    if (!res.ok) return fallbackPrompt(postTitle, postType)

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    return text || fallbackPrompt(postTitle, postType)
  } catch {
    return fallbackPrompt(postTitle, postType)
  }
}

function fallbackPrompt(postTitle: string, postType: string): string {
  return (
    `Minimalist abstract node-graph schematic on matte black #0A0A0A. ` +
    `Single emerald #00D084 accent glow on a procedural network topology diagram. ` +
    `Clean geometric composition, dramatic chiaroscuro studio lighting, editorial dark premium. ` +
    `${postType} format. Concept: "${postTitle}". No people, no servers, no planets. ` +
    `Bloomberg Businessweek art direction. Ultra-sharp 8K render.`
  )
}

export async function triggerImageGeneration(postId: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error: markError } = await supabase
    .from("posts")
    .update({ image_url: "__processing__" })
    .eq("id", postId)

  if (markError) {
    console.error("[triggerImageGeneration] mark error:", markError.message)
    return { ok: false, error: markError.message }
  }

  const [postResult, brandResult, inspirationResult] = await Promise.all([
    supabase
      .from("posts")
      .select("content, type, metadata, image_prompt")
      .eq("id", postId)
      .maybeSingle(),
    supabase
      .from("brand_vault")
      .select("primary_color, secondary_color, dark_color, visual_style_notes")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("inspiration_bank")
      .select("category_tags, format"),
  ])

  const post = postResult.data as {
    content: string
    type: string
    metadata: Record<string, unknown> | null
    image_prompt: string | null
  } | null
  const brandVault = brandResult.data as {
    primary_color: string | null
    secondary_color: string | null
    dark_color: string | null
    visual_style_notes: string | null
  } | null

  const inspirationRows = (inspirationResult.data ?? []) as Array<{
    category_tags: string[]
    format: string
  }>
  const postType = post?.type ?? "post_unico"
  const inspirationTags = [
    ...new Set(
      inspirationRows
        .filter((r) => r.format === postType || r.format === "single_post")
        .flatMap((r) => r.category_tags),
    ),
  ].slice(0, 12)

  const title = (post?.metadata?.title as string) ?? "Untitled"
  const direction = (post?.metadata?.visual_direction as string) ?? ""
  const prompt = post?.image_prompt
    ?? await generateRefinedPromptDashboard(
      post?.content ?? "",
      title,
      postType,
      direction,
      brandVault,
      inspirationTags,
    )

  let hash = 0
  for (let i = 0; i < postId.length; i++) hash = (hash * 31 + postId.charCodeAt(i)) >>> 0
  const mockUrl = MOCK_IMAGES[hash % MOCK_IMAGES.length]!

  const { error } = await supabase
    .from("posts")
    .update({ image_url: mockUrl, image_prompt: prompt })
    .eq("id", postId)

  if (error) {
    console.error("[triggerImageGeneration] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  return { ok: true }
}

// ─── Brand Vault ──────────────────────────────────────────────────────────────

export type BrandVaultInput = {
  id?: string | null
  logo_dark_url?: string | null
  logo_light_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  dark_color?: string | null
  font_family?: string | null
  visual_style_notes?: string | null
}

export async function saveBrandVault(input: BrandVaultInput): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const payload = {
    logo_dark_url: input.logo_dark_url ?? null,
    logo_light_url: input.logo_light_url ?? null,
    primary_color: input.primary_color ?? null,
    secondary_color: input.secondary_color ?? null,
    dark_color: input.dark_color ?? null,
    font_family: input.font_family ?? null,
    visual_style_notes: input.visual_style_notes ?? null,
    updated_at: new Date().toISOString(),
  }

  if (input.id) {
    const { error } = await supabase
      .from("brand_vault")
      .update(payload)
      .eq("id", input.id)
    if (error) {
      console.error("[saveBrandVault] update error:", error.message)
      return { ok: false, error: error.message }
    }
  } else {
    const { error } = await supabase.from("brand_vault").insert(payload)
    if (error) {
      console.error("[saveBrandVault] insert error:", error.message)
      return { ok: false, error: error.message }
    }
  }
  revalidatePath("/agentes")
  return { ok: true }
}

// ─── Inspiration Bank ─────────────────────────────────────────────────────────

export type InspirationFormat = "single_post" | "carousel" | "reels" | "lead_magnet"

export type InspirationInput = {
  title: string
  format: InspirationFormat
  media_url: string
  category_tags: string[]
}

export async function addInspiration(input: InspirationInput): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  if (!input.title.trim() || !input.media_url.trim()) {
    return { ok: false, error: "Título e mídia são obrigatórios." }
  }

  const { error } = await supabase.from("inspiration_bank").insert({
    title: input.title.trim(),
    format: input.format,
    media_url: input.media_url.trim(),
    category_tags: input.category_tags,
  })

  if (error) {
    console.error("[addInspiration] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  return { ok: true }
}

export async function deleteInspiration(id: string): Promise<ApproveResult> {
  const supabase = createClient()
  const user = await requireAuthorized()
  if (!user) return { ok: false, error: "Não autorizado." }

  const { error } = await supabase.from("inspiration_bank").delete().eq("id", id)
  if (error) {
    console.error("[deleteInspiration] db error:", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/agentes")
  return { ok: true }
}
