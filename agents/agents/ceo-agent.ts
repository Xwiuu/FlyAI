import { runLLM } from "../lib/llm-router.js";
import { loadSystemPrompt } from "../lib/prompts.js";
import { logAgent } from "../lib/logger.js";
import { serviceClient } from "../lib/supabase.js";
import type { ResearchOutput } from "./research-agent.js";

export interface CeoBriefInput {
  date: string; // YYYY-MM-DD
  research: ResearchOutput | null;
  research_error?: string;
  pending_posts: Array<{ id: string; type: string; preview: string }>;
  metrics_summary?: string | null;
}

export interface CeoBriefResult {
  brief_id: string;
  markdown: string;
  date: string;
}

export async function runCeoAgent(input: CeoBriefInput): Promise<CeoBriefResult> {
  const system = await loadSystemPrompt("ceo");

  const prompt = [
    `Data: ${input.date}.`,
    "",
    "Insumos:",
    "```json",
    JSON.stringify(
      {
        research: input.research,
        research_error: input.research_error ?? null,
        pending_posts: input.pending_posts,
        metrics_summary: input.metrics_summary ?? null,
      },
      null,
      2,
    ),
    "```",
    "",
    "Gere o brief markdown conforme estrutura do system prompt.",
    "Para cada post pendente, inclua link 'Aprovar' no formato [Aprovar](#focus={id}).",
  ].join("\n");

  const res = await runLLM({
    task: "analytics", // reasoning over structured input
    agent: "ceo",
    action: "ceo.daily_brief",
    system,
    prompt,
    temperature: 0.3,
    maxTokens: 2048,
  });

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("briefs")
    .upsert(
      {
        date: input.date,
        content: res.text,
        status: "pending",
      },
      { onConflict: "date" },
    )
    .select("id")
    .single();

  if (error || !data) {
    await logAgent({
      agent: "ceo",
      action: "ceo.daily_brief.persist",
      status: "error",
      error: error?.message ?? "upsert returned no row",
    });
    throw new Error(`ceo-agent: persist brief failed — ${error?.message ?? "unknown"}`);
  }

  await logAgent({
    agent: "ceo",
    action: "ceo.daily_brief.persist",
    status: "success",
    output: data.id,
    tokens_used: res.tokens_used,
  });

  return { brief_id: data.id, markdown: res.text, date: input.date };
}
