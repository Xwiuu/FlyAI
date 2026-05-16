import { z } from "zod";
import { runLLM } from "../lib/llm-router.js";
import { loadSystemPrompt, loadSkill } from "../lib/prompts.js";
import { extractJson } from "../lib/json.js";
import { logAgent } from "../lib/logger.js";

const ResearchSchema = z.object({
  date: z.string(),
  topics: z.array(
    z.object({
      topic: z.string().min(1).max(140),
      summary: z.string().min(10),
      source_url: z.string().url(),
      source_name: z.string().min(1),
      relevance: z.number().int().min(1).max(5),
      stale: z.boolean().default(false),
    }),
  ),
});

export type ResearchOutput = z.infer<typeof ResearchSchema>;

export async function runResearchAgent(date: string): Promise<ResearchOutput> {
  const [system, skill] = await Promise.all([
    loadSystemPrompt("research"),
    loadSkill("research-trends"),
  ]);

  const prompt = [
    `Data alvo: ${date}.`,
    "",
    "Use a busca web ativa para captar sinais dos últimos 7 dias.",
    "",
    "INSTRUÇÃO CRÍTICA DE FORMATO:",
    "Return ONLY raw JSON. Do not include markdown formatting, backticks, code fences, or any preamble/postamble text.",
    "Your entire response must be a single valid JSON object matching the schema below, starting with { and ending with }.",
    "",
    "Schema obrigatório:",
    '{ "date": "YYYY-MM-DD", "topics": [ { "topic": "string", "summary": "string", "source_url": "https://...", "source_name": "string", "relevance": 1-5, "stale": false } ] }',
    "",
    "Referência de skill:",
    skill,
  ].join("\n");

  const res = await runLLM({
    task: "research",
    agent: "research",
    action: "research.daily",
    system,
    prompt,
    webSearch: true,
    temperature: 0.3,
    maxTokens: 8192,
  });

  try {
    const parsed = ResearchSchema.parse(extractJson(res.text));
    await logAgent({
      agent: "research",
      action: "research.daily.parsed",
      status: "success",
      output: JSON.stringify(parsed),
      tokens_used: res.tokens_used,
    });
    return parsed;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logAgent({
      agent: "research",
      action: "research.daily.parsed",
      status: "error",
      error: message,
      output: res.text,
    });
    throw new Error(`research-agent: schema validation failed — ${message}`);
  }
}
