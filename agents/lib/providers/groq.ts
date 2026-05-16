import { env } from "../env.js";
import type { Provider, GenerateInput, ProviderResponse } from "./types.js";

const MODEL = "llama-3.3-70b-versatile";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { total_tokens?: number };
}

export const groqProvider: Provider = {
  name: "groq",
  supportsWebSearch: false,

  async generate(input: GenerateInput): Promise<ProviderResponse> {
    const messages: Array<{ role: string; content: string }> = [];
    if (input.system) messages.push({ role: "system", content: input.system });
    messages.push({ role: "user", content: input.prompt });

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.GROQ_API_KEY}`,
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
      throw new Error(`groq http ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as GroqResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("groq: empty response");

    return { text, tokens_used: data.usage?.total_tokens ?? null, raw: data };
  },
};
