import { z } from "zod";
import { runLLM } from "../lib/llm-router.js";
import { loadSystemPrompt, loadSkill, loadBrandBible } from "../lib/prompts.js";
import { extractJson } from "../lib/json.js";
import { logAgent } from "../lib/logger.js";
import { serviceClient } from "../lib/supabase.js";
import { generateRefinedPrompt } from "./prompt-agent.js";

export type ContentType = "carousel" | "stories" | "post_unico";

export const HookSchema = z.object({
  variant: z.enum(["medo_perda", "dados_frios", "ironia_mercado"]),
  text: z.string().min(1),
});

export const AudioVisualCueSchema = z.object({
  frame: z.number().int().min(1),
  visual_cue: z.string().min(1),
  audio_cue: z.string().min(1),
});

const ContentSchema = z.object({
  type: z.enum(["carousel", "stories", "post_unico"]),
  title: z.string().min(1),
  // Matriz obrigatória: 3 variantes (medo_perda, dados_frios, ironia_mercado).
  // O hook publicado é hooks[0].text; os demais ficam em metadata para A/B.
  hooks: z.array(HookSchema).length(3),
  // carousel: 5–8 slides | stories: 3–5 frames | post_unico: string
  body: z.union([z.string().min(1), z.array(z.string().min(1)).min(3).max(8)]),
  // Frame-a-frame de Reels/Stories. Optional para post_unico estático.
  audio_visual_cues: z.array(AudioVisualCueSchema).optional(),
  // Prompt cinematográfico para gerador de imagem (Midjourney v6 / Flux).
  visual_direction: z.string().min(1),
  call_to_action: z.string().min(1),
  hashtags: z.array(z.string()).max(5).default([]),
  rationale: z.string().min(1),
});

export type Hook = z.infer<typeof HookSchema>;
export type AudioVisualCue = z.infer<typeof AudioVisualCueSchema>;
export type ContentOutput = z.infer<typeof ContentSchema>;

export interface ContentInput {
  type: ContentType;
  briefing: string;
  /** Optional skill override, defaults derived from type. */
  skill?: string;
  /** When true, persists the result as a pending post and returns its id. */
  persist?: boolean;
  /** Disable the Devil's Advocate critique pass (default: enabled). */
  skipDevilsAdvocate?: boolean;
}

export interface ContentResult {
  output: ContentOutput;
  post_id?: string;
}

function skillForType(type: ContentType): string {
  if (type === "carousel") return "instagram-carousel";
  if (type === "stories") return "instagram-stories";
  return "instagram-post-unico";
}

function serializeContent(out: ContentOutput): string {
  const bodyText = Array.isArray(out.body) ? out.body.join("\n\n---\n\n") : out.body;
  const tags = out.hashtags.length ? `\n\n${out.hashtags.join(" ")}` : "";
  // Canonical hook = primeira variante. As outras 2 ficam em metadata para A/B futuro.
  return `${out.hooks[0]!.text}\n\n${bodyText}\n\n${out.call_to_action}${tags}`;
}

async function buildNanobananaPrompt(
  output: ContentOutput,
  briefing: string,
): Promise<string> {
  try {
    const { runCreativeDirector } = await import("./creative-director.js");
    const weeklyThesis = await fetchLatestWeeklyThesis();
    const cda = await runCreativeDirector({
      briefing,
      content_type: output.type,
      post_content: serializeContent(output),
      post_title: output.title,
      weekly_thesis: weeklyThesis,
    });
    return cda.nanobanana_prompt;
  } catch {
    const weeklyThesis = await fetchLatestWeeklyThesis();
    return generateRefinedPrompt({
      post_copy: serializeContent(output),
      post_title: output.title,
      format: output.type,
      weekly_thesis: weeklyThesis,
    });
  }
}

async function fetchLatestWeeklyThesis(): Promise<string | null> {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("weekly_plans")
    .select("theme, plan")
    .order("week_of", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const plan = data.plan as Record<string, unknown> | null;
  const angles = plan?.angles as Array<{ thesis?: string }> | undefined;
  const theses = angles?.map((a) => a.thesis).filter(Boolean) ?? [];

  return theses.length > 0
    ? `Tema: ${data.theme}\nTeses: ${theses.join(" | ")}`
    : data.theme ?? null;
}

export async function runContentAgent(input: ContentInput): Promise<ContentResult> {
  const [system, skill, brand] = await Promise.all([
    loadSystemPrompt("content"),
    loadSkill(input.skill ?? skillForType(input.type)),
    loadBrandBible(),
  ]);

  const prompt = [
    `Tipo de output: ${input.type}.`,
    "",
    "Briefing:",
    input.briefing,
    "",
    "Skill estrutural:",
    skill,
    "",
    "Brand bible (regras inegociáveis):",
    brand,
    "",
    "Devolva JSON estrito conforme o schema do system prompt. Nenhum texto fora do JSON.",
  ].join("\n");

  const res = await runLLM({
    task: "copy_ptbr",
    agent: "content",
    action: `content.${input.type}`,
    system,
    prompt,
    temperature: 0.6,
    maxTokens: 4096,
  });

  let parsed: ContentOutput;
  try {
    parsed = ContentSchema.parse(extractJson(res.text));
    if (parsed.type !== input.type) {
      throw new Error(`type mismatch: requested ${input.type}, got ${parsed.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logAgent({
      agent: "content",
      action: `content.${input.type}.parsed`,
      status: "error",
      error: message,
      output: res.text,
    });
    throw new Error(`content-agent: ${message}`);
  }

  await logAgent({
    agent: "content",
    action: `content.${input.type}.parsed`,
    status: "success",
    output: JSON.stringify(parsed),
    tokens_used: res.tokens_used,
  });

  // Devil's Advocate critique pass — concatenates skeptical critique into rationale.
  if (!input.skipDevilsAdvocate) {
    const { runDevilsAdvocate } = await import("./devils-advocate.js");
    const da = await runDevilsAdvocate({ draft: parsed, topic_briefing: input.briefing });
    if (da.critiques.length > 0) {
      const bullets = da.critiques.map((c) => `- ${c}`).join("\n");
      parsed.rationale = `${parsed.rationale}\n\n**Crítica cética (Advogado do Diabo — ${da.verdict}):**\n${bullets}`;
    }
  }

  if (!input.persist) return { output: parsed };

  const imagePrompt = await buildNanobananaPrompt(parsed, input.briefing);

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      agent: "content",
      type: parsed.type,
      content: serializeContent(parsed),
      status: "pending",
      metadata: parsed,
      image_prompt: imagePrompt,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`content-agent: insert posts failed — ${error?.message ?? "unknown"}`);
  }

  return { output: parsed, post_id: data.id };
}
