import { z } from "zod";
import { runLLM } from "../lib/llm-router.js";
import { loadSystemPrompt, loadSkill, loadBrandBible } from "../lib/prompts.js";
import { extractJson } from "../lib/json.js";
import { logAgent } from "../lib/logger.js";
import { serviceClient } from "../lib/supabase.js";

export type ContentType = "linkedin" | "instagram" | "carousel";

const ContentSchema = z.object({
  type: z.enum(["linkedin", "instagram", "carousel"]),
  title: z.string().min(1),
  content: z.union([z.string().min(1), z.array(z.string().min(1)).min(3)]),
  hashtags: z.array(z.string()).max(5).default([]),
  rationale: z.string().min(1),
});

export type ContentOutput = z.infer<typeof ContentSchema>;

export interface ContentInput {
  type: ContentType;
  briefing: string;
  /** Optional skill override, defaults derived from type. */
  skill?: string;
  /** When true, persists the result as a pending post and returns its id. */
  persist?: boolean;
}

export interface ContentResult {
  output: ContentOutput;
  post_id?: string;
}

function skillForType(type: ContentType): string {
  if (type === "carousel") return "instagram-carousel";
  if (type === "instagram") return "instagram-carousel";
  return "linkedin-post";
}

function serializeContent(out: ContentOutput): string {
  if (Array.isArray(out.content)) return out.content.join("\n\n---\n\n");
  return out.content;
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
    maxTokens: 2048,
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

  if (!input.persist) return { output: parsed };

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      agent: "content",
      type: parsed.type,
      content: serializeContent(parsed),
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`content-agent: insert posts failed — ${error?.message ?? "unknown"}`);
  }

  return { output: parsed, post_id: data.id };
}
