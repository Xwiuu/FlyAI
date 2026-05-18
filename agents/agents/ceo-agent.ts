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
    "## Insumos dos agentes upstream",
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
    "## Instrução de saída",
    "Produza o brief em Markdown seguindo EXATAMENTE esta estrutura (sem omitir nenhuma seção):",
    "",
    "# Daily Brief — {date}",
    "",
    "## As 3 alavancas do dia",
    "1. **{Alavanca}** — {1 frase de tese}.",
    "   *Modelo mental:* {nome do princípio: custo de oportunidade | segunda ordem | inversão | margem de segurança}.",
    "   *Próxima ação:* {ação concreta para o CTO hoje}.",
    "(repetir para 2 e 3)",
    "",
    "## Sinais do dia (Research)",
    "- 3–5 bullets reescritos com tese — NÃO copie literal do insumo.",
    "- Se research_error não for null: escreva 'Research Agent: erro — verificar logs'.",
    "",
    "## Conteúdo pendente",
    "- Liste cada post com link [Aprovar](#focus={id}). Se vazio: '— Nenhum post pendente.'",
    "",
    "## Métricas (delta semanal)",
    "- 2–3 bullets do metrics_summary. Se null: '— Métricas indisponíveis.'",
    "  Conversion rate nulo = '—', nunca '0%'.",
    "",
    "## Risco silencioso",
    "- 1 linha: o que pode estar dando errado sem fazer barulho.",
  ].join("\n");

  const res = await runLLM({
    task: "analytics", // reasoning over structured input
    agent: "ceo",
    action: "ceo.daily_brief",
    system,
    prompt,
    temperature: 0.3,
    maxTokens: 4096,
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
