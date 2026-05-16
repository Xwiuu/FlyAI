import { env } from "../env.js";
import type { Provider, GenerateInput, ProviderResponse } from "./types.js";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: { totalTokenCount?: number };
}

export const geminiProvider: Provider = {
  name: "gemini",
  supportsWebSearch: true,

  async generate(input: GenerateInput): Promise<ProviderResponse> {
    const body: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: [{ text: input.prompt }],
        },
      ],
      generationConfig: {
        temperature: input.temperature ?? 0.4,
        maxOutputTokens: input.maxTokens ?? 2048,
      },
    };

    if (input.system) {
      body.systemInstruction = { parts: [{ text: input.system }] };
    }

    if (input.webSearch) {
      body.tools = [{ google_search: {} }];
    }

    const res = await fetch(`${ENDPOINT}?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: input.signal,
    });

    if (!res.ok) {
      throw new Error(`gemini http ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new Error("gemini: empty response");
    }

    return {
      text,
      tokens_used: data.usageMetadata?.totalTokenCount ?? null,
      raw: data,
    };
  },
};
