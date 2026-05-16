export type ProviderName = "gemini" | "groq" | "nim" | "openrouter";

export interface GenerateInput {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  /** When true and provider supports it, enable web search grounding. */
  webSearch?: boolean;
  signal: AbortSignal;
}

export interface ProviderResponse {
  text: string;
  tokens_used: number | null;
  /** Provider-specific raw payload, for debugging. Never persisted. */
  raw?: unknown;
}

export interface Provider {
  readonly name: ProviderName;
  readonly supportsWebSearch: boolean;
  generate(input: GenerateInput): Promise<ProviderResponse>;
}
