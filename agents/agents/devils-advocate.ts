import { z } from "zod";
import { runLLM } from "../lib/llm-router.js";
import { loadSystemPrompt } from "../lib/prompts.js";
import { extractJson } from "../lib/json.js";
import { logAgent } from "../lib/logger.js";
import type { ContentOutput } from "./content-agent.js";

const DevilsAdvocateSchema = z.object({
  critiques: z.array(z.string().min(1)).min(1).max(8),
  verdict: z.enum(["pass", "refine"]),
});

export type DevilsAdvocateOutput = z.infer<typeof DevilsAdvocateSchema>;

export interface DevilsAdvocateInput {
  draft: ContentOutput;
  topic_briefing: string;
}

export interface DevilsAdvocateResult {
  critiques: string[];
  verdict: "pass" | "refine";
}

/**
 * Invisible critique pass. Reads the Content Agent's draft + the topic briefing
 * and returns short, cold critiques meant to be appended to `rationale` so the
 * founder sees a skeptical second opinion before approving.
 *
 * Never throws — a failed critique pass is logged and degrades to "no critique"
 * so it never blocks the content pipeline.
 */
export async function runDevilsAdvocate(
  input: DevilsAdvocateInput,
): Promise<DevilsAdvocateResult> {
  try {
    const system = await loadSystemPrompt("devils-advocate");

    const prompt = [
      "Você está revisando o rascunho abaixo. Use a doutrina do system prompt.",
      "",
      "Briefing do tópico (fonte original):",
      input.topic_briefing,
      "",
      "Rascunho gerado pelo Copy Chief (JSON):",
      "```json",
      JSON.stringify(input.draft, null, 2),
      "```",
      "",
      "Retorne JSON estrito conforme o schema. Sem markdown wrapping.",
    ].join("\n");

    const res = await runLLM({
      task: "analytics",
      agent: "devils_advocate",
      action: `devils_advocate.${input.draft.type}`,
      system,
      prompt,
      temperature: 0.2,
      maxTokens: 1024,
    });

    const parsed = DevilsAdvocateSchema.parse(extractJson(res.text));

    await logAgent({
      agent: "devils_advocate",
      action: `devils_advocate.${input.draft.type}.parsed`,
      status: "success",
      output: JSON.stringify(parsed),
      tokens_used: res.tokens_used,
    });

    return parsed;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logAgent({
      agent: "devils_advocate",
      action: `devils_advocate.${input.draft.type}.parsed`,
      status: "error",
      error: message,
    });
    // Degradação suave: sem crítica é melhor que crash no pipeline de conteúdo.
    return { critiques: [], verdict: "pass" };
  }
}
