import { env } from "../env.js";
import type { Provider, GenerateInput, ProviderResponse } from "./types.js";

const MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { total_tokens?: number };
}

export const openrouterProvider: Provider = {
  name: "openrouter",
  supportsWebSearch: false,

  async generate(input: GenerateInput): Promise<ProviderResponse> {
    if (!env.OPENROUTER_API_KEY) {
      throw new Error("openrouter: OPENROUTER_API_KEY not set");
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (input.system) messages.push({ role: "system", content: input.system });
    messages.push({ role: "user", content: input.prompt });

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "x-title": "Fly.AI Agents",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: input.temperature ?? 0.4,
        max_tokens: input.maxTokens ?? 2048,
      }),
      signal: input.signal,
    });

    if (!res.ok) {
      throw new Error(`openrouter http ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as OpenRouterResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("openrouter: empty response");

    return { text, tokens_used: data.usage?.total_tokens ?? null, raw: data };
  },
};
