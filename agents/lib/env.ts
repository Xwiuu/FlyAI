import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  GEMINI_API_KEY: z.string().min(10),
  GROQ_API_KEY: z.string().min(10),
  NVIDIA_NIM_API_KEY: z.string().min(10),
  OPENROUTER_API_KEY: z.string().min(10).optional(),
  DISCORD_WEBHOOK_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const flat = parsed.error.flatten().fieldErrors;
  const msg = Object.entries(flat)
    .map(([k, v]) => `  - ${k}: ${(v ?? []).join(", ")}`)
    .join("\n");
  throw new Error(`[agents] Invalid environment variables:\n${msg}`);
}

export const env = parsed.data;
