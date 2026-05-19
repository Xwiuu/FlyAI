import { serviceClient } from "./supabase.js";

export type MeetingType = "weekly_planning" | "crisis" | "content_review" | "ad_hoc";

export type MeetingStatus = "active" | "awaiting_user" | "completed" | "archived";

export type MeetingSender =
  | "user"
  | "research_agent"
  | "content_agent"
  | "ceo_agent"
  | "analytics_agent"
  | "devils_advocate";

export type MeetingRole = "user" | "assistant" | "system";

export interface MeetingRow {
  id: string;
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  created_at: string;
  completed_at: string | null;
}

export interface MeetingMessageRow {
  id: string;
  meeting_id: string;
  sender: MeetingSender;
  role: MeetingRole;
  content: string;
  sequence: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function createMeeting(input: {
  type: MeetingType;
  title: string;
}): Promise<{ id: string }> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("agent_meetings")
    .insert({ type: input.type, title: input.title, status: "active" })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`meetings.create: ${error?.message ?? "no row returned"}`);
  }
  return { id: data.id as string };
}

export async function getMeeting(id: string): Promise<MeetingRow | null> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("agent_meetings")
    .select("id, title, type, status, created_at, completed_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as unknown as MeetingRow;
}

export async function listMessages(meeting_id: string): Promise<MeetingMessageRow[]> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("meeting_messages")
    .select("id, meeting_id, sender, role, content, sequence, metadata, created_at")
    .eq("meeting_id", meeting_id)
    .order("sequence", { ascending: true });
  if (error || !data) return [];
  return data as unknown as MeetingMessageRow[];
}

export async function appendMessage(input: {
  meeting_id: string;
  sender: MeetingSender;
  role: MeetingRole;
  content: string;
  metadata?: Record<string, unknown> | null;
}): Promise<MeetingMessageRow> {
  const supabase = serviceClient();

  // sequence = MAX(sequence) + 1 — read-then-write (single user system, no race).
  const { data: maxRow } = await supabase
    .from("meeting_messages")
    .select("sequence")
    .eq("meeting_id", input.meeting_id)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sequence = ((maxRow?.sequence as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("meeting_messages")
    .insert({
      meeting_id: input.meeting_id,
      sender: input.sender,
      role: input.role,
      content: input.content,
      sequence,
      metadata: input.metadata ?? null,
    })
    .select("id, meeting_id, sender, role, content, sequence, metadata, created_at")
    .single();

  if (error || !data) {
    throw new Error(`meetings.appendMessage: ${error?.message ?? "no row returned"}`);
  }
  return data as unknown as MeetingMessageRow;
}

export async function setMeetingStatus(
  id: string,
  status: MeetingStatus,
): Promise<void> {
  const supabase = serviceClient();
  const patch: Record<string, unknown> = { status };
  if (status === "completed") patch.completed_at = new Date().toISOString();
  const { error } = await supabase.from("agent_meetings").update(patch).eq("id", id);
  if (error) throw new Error(`meetings.setStatus: ${error.message}`);
}

/**
 * Formats prior messages into a chat-style transcript that can be prepended
 * to an agent's LLM prompt. Keeps `sequence` order, labels each turn.
 */
export function renderTranscript(messages: MeetingMessageRow[]): string {
  if (messages.length === 0) return "(reunião vazia)";
  return messages
    .map((m) => `[#${m.sequence} ${m.sender}]\n${m.content}`)
    .join("\n\n---\n\n");
}
