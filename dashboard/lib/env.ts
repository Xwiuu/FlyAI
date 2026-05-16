import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

const isServer = typeof window === "undefined";

const parsed = (isServer ? serverSchema : publicSchema).safeParse(
  isServer
    ? process.env
    : {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
);

if (!parsed.success) {
  const flat = parsed.error.flatten().fieldErrors;
  const msg = Object.entries(flat)
    .map(([k, v]) => `  - ${k}: ${(v ?? []).join(", ")}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${msg}`);
}

export const env = parsed.data;

export function serviceRoleKey(): string {
  if (!isServer) {
    throw new Error("serviceRoleKey() called from a client bundle");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  return key;
}
