import { geminiProvider } from "./gemini.js";
import { groqProvider } from "./groq.js";
import { nimProvider } from "./nim.js";
import { openrouterProvider } from "./openrouter.js";
import type { Provider, ProviderName } from "./types.js";

export const providers: Record<ProviderName, Provider> = {
  gemini: geminiProvider,
  groq: groqProvider,
  nim: nimProvider,
  openrouter: openrouterProvider,
};

export type { Provider, ProviderName, ProviderResponse, GenerateInput } from "./types.js";
