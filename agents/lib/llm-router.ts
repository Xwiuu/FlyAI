import { providers, type GenerateInput, type ProviderName, type ProviderResponse } from "./providers/index.js";
import { callWithTimeout, LLM_TIMEOUT_MS } from "./timeout.js";
import { logAgent, type AgentName } from "./logger.js";

export type TaskType =
  | "research"      // grounded web search
  | "copy_ptbr"     // premium Brazilian-Portuguese copy
  | "analytics"     // reasoning over numeric data
  | "fast"          // low-latency utility calls
  | "long_context"; // > 100k tokens

/** Primary provider per task — see CLAUDE.md §LLM Router. */
export function route(task: TaskType): ProviderName {
  switch (task) {
    case "long_context": return "gemini";
    case "research":     return "gemini";
    case "copy_ptbr":    return "nim";
    case "analytics":    return "gemini";
    case "fast":         return "groq";
    default:             return "gemini";
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
 * Runs the task against the primary provider, falling back through the chain
 * on timeout or transient errors. Every attempt is recorded in agent_logs.
 */
export async function runLLM(opts: RunLLMOptions): Promise<RunLLMResult> {
  const primary = route(opts.task);
  const ordered = [primary, ...FALLBACK_CHAIN.filter((p) => p !== primary)];
  const action = opts.action ?? `llm.${opts.task}`;
  const agent: AgentName = opts.agent ?? "router";
  const attempts: RunLLMResult["attempts"] = [];

  for (const name of ordered) {
    const provider = providers[name];

    // Skip providers that can't satisfy a hard requirement (web search).
    if (opts.webSearch && !provider.supportsWebSearch) {
      attempts.push({
        provider: name,
        ok: false,
        duration_ms: 0,
        error: "provider does not support webSearch",
      });
      continue;
    }

    const result = await callWithTimeout(
      (signal) =>
        provider.generate({
          system: opts.system,
          prompt: opts.prompt,
          maxTokens: opts.maxTokens,
          temperature: opts.temperature,
          webSearch: opts.webSearch,
          signal,
        }),
      opts.timeoutMs ?? LLM_TIMEOUT_MS,
    );

    if (result.ok) {
      attempts.push({ provider: name, ok: true, duration_ms: result.duration_ms });
      await logAgent({
        agent,
        action: `${action}.${name}`,
        status: "success",
        tokens_used: result.value.tokens_used,
        duration_ms: result.duration_ms,
      });
      return { ...result.value, provider: name, attempts };
    }

    attempts.push({
      provider: name,
      ok: false,
      duration_ms: result.duration_ms,
      error: result.error.message,
      timedOut: result.timedOut,
    });
    await logAgent({
      agent,
      action: `${action}.${name}`,
      status: "error",
      error: `${result.timedOut ? "[timeout] " : ""}${result.error.message}`,
      duration_ms: result.duration_ms,
    });
  }

  throw new Error(
    `runLLM exhausted fallback chain for task=${opts.task}. Attempts: ${JSON.stringify(attempts)}`,
  );
}
