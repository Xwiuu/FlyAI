import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

let cached: SupabaseClient | null = null;

/**
 * Service-role client for agent writes. Bypasses RLS — use only on the agent
 * runner (GitHub Actions), never in browser bundles.
 */
export function serviceClient(): SupabaseClient {
  if (!cached) {
    cached = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
