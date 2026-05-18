import { z } from "zod";
import { runLLM } from "../lib/llm-router.js";
import { loadSystemPrompt } from "../lib/prompts.js";
import { extractJson } from "../lib/json.js";
import { logAgent } from "../lib/logger.js";
import { serviceClient } from "../lib/supabase.js";

const WeeklyPlanSchema = z.object({
  week_of: z.string(),
  theme: z.string().min(1),
  market_gaps: z
    .array(
      z.object({
        gap: z.string().min(1),
        evidence: z.string().min(1),
        why_now: z.string().min(1),
      }),
    )
    .min(2),
  angles: z
    .array(
      z.object({
        angle: z.string().min(1),
        thesis: z.string().min(1),
        best_format: z.enum(["carousel", "stories", "post_unico"]),
        risk: z.string().min(1),
      }),
    )
    .min(3),
  weekly_plan: z.object({
    pillar: z.object({
      title: z.string().min(1),
      format: z.literal("carousel"),
      angle_ref: z.string().min(1),
    }),
    satellites: z
      .array(
        z.object({
          title: z.string().min(1),
          format: z.enum(["stories", "post_unico"]),
          angle_ref: z.string().min(1),
        }),
      )
      .min(3),
  }),
  narrative_risks: z.array(z.string().min(1)).min(1),
});

export type WeeklyPlanOutput = z.infer<typeof WeeklyPlanSchema>;

export interface WeeklyResearchInput {
  theme: string;
  weekOf: string; // YYYY-MM-DD (segunda-feira)
}

export interface WeeklyResearchResult {
  plan: WeeklyPlanOutput;
  plan_id: string;
}

export async function runResearchWeeklyAgent(
  input: WeeklyResearchInput,
): Promise<WeeklyResearchResult> {
  const system = await loadSystemPrompt("research-weekly");

  const prompt = [
    `Tema central: ${input.theme}`,
    `Semana (segunda-feira): ${input.weekOf}`,
    "",
    "Use busca web ativa para mapear gaps e evidências dos últimos 14 dias.",
    "",
    "INSTRUÇÃO CRÍTICA DE FORMATO:",
    "Return ONLY raw JSON. No markdown, no code fences, no preamble. Start with { end with }.",
    "Respeite o schema do system prompt EXATAMENTE.",
  ].join("\n");

  const res = await runLLM({
    task: "research",
    agent: "research",
    action: "research.weekly",
    system,
    prompt,
    webSearch: true,
    temperature: 0.3,
    maxTokens: 8192,
  });

  let parsed: WeeklyPlanOutput;
  try {
    parsed = WeeklyPlanSchema.parse(extractJson(res.text));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logAgent({
      agent: "research",
      action: "research.weekly.parsed",
      status: "error",
      error: message,
      output: res.text,
    });
    throw new Error(`research-weekly-agent: schema validation failed — ${message}`);
  }

  // Persist as pending — UI consumes from weekly_plans (status='pending').
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("weekly_plans")
    .upsert(
      {
        week_of: parsed.week_of,
        theme: parsed.theme,
        plan: parsed,
        status: "pending",
      },
      { onConflict: "week_of" },
    )
    .select("id")
    .single();

  if (error || !data) {
    await logAgent({
      agent: "research",
      action: "research.weekly.persist",
      status: "error",
      error: error?.message ?? "upsert returned no row",
      output: JSON.stringify(parsed),
    });
    throw new Error(
      `research-weekly-agent: persist failed — ${error?.message ?? "unknown"}`,
    );
  }

  await logAgent({
    agent: "research",
    action: "research.weekly.parsed",
    status: "success",
    output: data.id,
    tokens_used: res.tokens_used,
  });

  return { plan: parsed, plan_id: data.id };
}
