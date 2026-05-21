import { providers, type GenerateInput, type ProviderName, type ProviderResponse } from "./providers/index.js";
import { callWithTimeout, LLM_TIMEOUT_MS } from "./timeout.js";
import { logAgent, type AgentName } from "./logger.js";

export type TaskType =
  | "research"            // grounded web search
  | "copy_ptbr"           // premium Brazilian-Portuguese copy
  | "analytics"           // reasoning over numeric data
  | "fast"                // low-latency utility calls
  | "long_context"        // > 100k tokens
  | "visual_prompt"       // prompt engineering for image generation
  | "creative_strategy";  // CDA reasoning (briefing, research, concepts, critique)

/** Primary provider per task — see CLAUDE.md §LLM Router. */
export function route(task: TaskType): ProviderName {
  switch (task) {
    case "long_context":  return "gemini";
    case "research":      return "gemini";
    case "copy_ptbr":     return "nim";
    case "analytics":     return "gemini";
    case "visual_prompt":       return "gemini";
    case "creative_strategy":   return "gemini";
    case "fast":                return "groq";
    default:                    return "gemini";
  }
}

const FALLBACK_CHAIN: ProviderName[] = ["gemini", "groq", "nim", "openrouter"];

export interface RunLLMOptions extends Omit<GenerateInput, "signal"> {
  task: TaskType;
  /** Agent label written to agent_logs. Defaults to "router". */
  agent?: AgentName;
  /** Logical action name (e.g. "research.search", "content.linkedin"). */
  action?: string;
  /** Per-attempt hard timeout. Defaults to 15s. */
  timeoutMs?: number;
}

export interface RunLLMResult extends ProviderResponse {
  provider: ProviderName;
  attempts: Array<{
    provider: ProviderName;
    ok: boolean;
    duration_ms: number;
    error?: string;
    timedOut?: boolean;
  }>;
}

/**
 * Injected into the prompt when all web-search providers are down and the task
 * falls back to an offline model. Tells the model to use internal knowledge and
 * emit placeholder URLs so the JSON schema contract is not broken.
 */
const OFFLINE_FALLBACK_NOTICE = `
[MODO OFFLINE — DEGRADAÇÃO SUAVE]
O provider de busca web está indisponível (503 / timeout). Você está rodando SEM acesso à internet.
Regras de degradação:
1. Use seu conhecimento de treinamento para preencher os campos de conteúdo com o melhor dado disponível.
2. Para campos que exigem URL (source_url, evidence, etc.), use a string literal "offline://no-source" — nunca fabrique URLs https:// que pareçam reais.
3. Quando aplicável, marque stale: true nos tópicos.
4. NÃO omita nenhum campo obrigatório do schema — o contrato do banco deve ser preservado.
5. Retorne JSON válido conforme o schema definido, sem markdown wrapping.
`.trim();

/**
 * Attempt a single provider call; returns the router's result record or throws.
 * All attempt metadata is pushed into `attempts` in-place.
 */
async function tryProvider(
  name: ProviderName,
  opts: RunLLMOptions,
  prompt: string,
  webSearch: boolean,
  timeoutMs: number,
  attempts: RunLLMResult["attempts"],
): Promise<RunLLMResult["attempts"][number] & { value?: ProviderResponse }> {
  const provider = providers[name];
  const result = await callWithTimeout(
    (signal) =>
      provider.generate({
        system: opts.system,
        prompt,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
        webSearch,
        signal,
      }),
    timeoutMs,
  );

  if (result.ok) {
    const entry = { provider: name, ok: true as const, duration_ms: result.duration_ms };
    attempts.push(entry);
    return { ...entry, value: result.value };
  }

  const entry = {
    provider: name,
    ok: false as const,
    duration_ms: result.duration_ms,
    error: result.error.message,
    timedOut: result.timedOut,
  };
  attempts.push(entry);
  return entry;
}

/**
 * Runs the task against the primary provider, falling back through the chain
 * on timeout or transient errors.
 *
 * Two-phase strategy when webSearch is requested:
 *   Phase 1 — try all web-capable providers (Gemini) with webSearch: true.
 *   Phase 2 — if every Phase 1 attempt fails, fall back to offline providers
 *              with webSearch: false and OFFLINE_FALLBACK_NOTICE prepended to
 *              the prompt so the model fills gaps from internal knowledge
 *              without breaking the JSON schema contract.
 *
 * Every attempt is recorded in agent_logs.
 */
export async function runLLM(opts: RunLLMOptions): Promise<RunLLMResult> {
  const primary = route(opts.task);
  const ordered = [primary, ...FALLBACK_CHAIN.filter((p) => p !== primary)];
  const action = opts.action ?? `llm.${opts.task}`;
  const agent: AgentName = opts.agent ?? "router";
  const timeoutMs = opts.timeoutMs ?? LLM_TIMEOUT_MS;
  const attempts: RunLLMResult["attempts"] = [];

  // When webSearch is not required, run the chain normally — no split needed.
  if (!opts.webSearch) {
    for (const name of ordered) {
      const attempt = await tryProvider(name, opts, opts.prompt, false, timeoutMs, attempts);
      if (attempt.ok && attempt.value) {
        await logAgent({ agent, action: `${action}.${name}`, status: "success", tokens_used: attempt.value.tokens_used, duration_ms: attempt.duration_ms });
        return { ...attempt.value, provider: name, attempts };
      }
      await logAgent({ agent, action: `${action}.${name}`, status: "error", error: `${attempt.timedOut ? "[timeout] " : ""}${attempt.error}`, duration_ms: attempt.duration_ms });
    }
    throw new Error(`runLLM exhausted fallback chain for task=${opts.task}. Attempts: ${JSON.stringify(attempts)}`);
  }

  // Phase 1 — web-capable providers (webSearch: true).
  const webProviders = ordered.filter((n) => providers[n].supportsWebSearch);
  const offlineProviders = ordered.filter((n) => !providers[n].supportsWebSearch);

  for (const name of webProviders) {
    const attempt = await tryProvider(name, opts, opts.prompt, true, timeoutMs, attempts);
    if (attempt.ok && attempt.value) {
      await logAgent({ agent, action: `${action}.${name}`, status: "success", tokens_used: attempt.value.tokens_used, duration_ms: attempt.duration_ms });
      return { ...attempt.value, provider: name, attempts };
    }
    await logAgent({ agent, action: `${action}.${name}`, status: "error", error: `${attempt.timedOut ? "[timeout] " : ""}${attempt.error}`, duration_ms: attempt.duration_ms });
  }

  // Phase 2 — graceful degradation: offline providers with augmented prompt.
  if (offlineProviders.length > 0) {
    await logAgent({ agent, action: `${action}.offline_fallback`, status: "pending", error: "All web-search providers failed — retrying offline with knowledge-base degradation." });
    const degradedPrompt = `${OFFLINE_FALLBACK_NOTICE}\n\n${opts.prompt}`;

    for (const name of offlineProviders) {
      const attempt = await tryProvider(name, opts, degradedPrompt, false, timeoutMs, attempts);
      if (attempt.ok && attempt.value) {
        await logAgent({ agent, action: `${action}.${name}.offline`, status: "success", tokens_used: attempt.value.tokens_used, duration_ms: attempt.duration_ms });
        return { ...attempt.value, provider: name, attempts };
      }
      await logAgent({ agent, action: `${action}.${name}.offline`, status: "error", error: `${attempt.timedOut ? "[timeout] " : ""}${attempt.error}`, duration_ms: attempt.duration_ms });
    }
  }

  throw new Error(
    `runLLM exhausted all providers (including offline fallback) for task=${opts.task}. Attempts: ${JSON.stringify(attempts)}`,
  );
}
