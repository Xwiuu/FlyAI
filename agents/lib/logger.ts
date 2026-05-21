import { serviceClient } from "./supabase.js";

export type AgentName =
  | "research"
  | "content"
  | "analytics"
  | "ceo"
  | "router"
  | "devils_advocate"
  | "meeting"
  | "creative_director";
export type LogStatus = "success" | "error" | "pending";

export interface LogEntry {
  agent: AgentName;
  action: string;
  status: LogStatus;
  output?: string | null;
  error?: string | null;
  tokens_used?: number | null;
  duration_ms?: number | null;
}

/**
 * Best-effort write to agent_logs. Never throws — log failures must not crash
 * the workflow that is trying to report a (possibly already-failed) state.
 */
export async function logAgent(entry: LogEntry): Promise<void> {
  try {
    const supabase = serviceClient();
    const { error } = await supabase.from("agent_logs").insert({
      agent: entry.agent,
      action: entry.action,
      status: entry.status,
      output: entry.output ?? null,
      error: entry.error ?? null,
      tokens_used: entry.tokens_used ?? null,
      duration_ms: entry.duration_ms ?? null,
    });
    if (error) {
      console.error("[logAgent] insert failed:", error.message);
    }
  } catch (err) {
    console.error("[logAgent] unexpected:", err);
  }
}
