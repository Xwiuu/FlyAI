import { listMessages, type MeetingMessageRow, type MeetingType } from "./meetings.js";
import { serviceClient } from "./supabase.js";
import { logAgent } from "./logger.js";

/** Shape of a single post parsed out of a content_agent meeting turn. */
export interface ParsedPost {
  type: "carousel" | "stories" | "post_unico";
  title: string;
  hooks: Array<{ variant: string; text: string }>;
  body: string | string[];
  visual_direction: string;
  call_to_action: string;
  hashtags: string[];
  raw_block: string;
}

/**
 * Materializes the content_agent turns of a completed `weekly_planning`
 * meeting into rows of `public.posts` (status='pending') so the founder
 * sees them in the /agentes approval queue.
 *
 * Idempotent: if any post already has `metadata->>source_meeting_id =
 * meetingId`, the call is a no-op. Safe to invoke multiple times.
 *
 * Returns the number of posts inserted.
 */
export async function materializeMeetingPosts(
  meetingId: string,
  meetingType: MeetingType,
): Promise<number> {
  // Only weekly_planning produces a structured post bundle.
  if (meetingType !== "weekly_planning") return 0;

  const supabase = serviceClient();

  // Idempotency guard — JSONB path equality.
  const { data: existing, error: existingErr } = await supabase
    .from("posts")
    .select("id")
    .eq("metadata->>source_meeting_id", meetingId)
    .limit(1);

  if (existingErr) {
    console.error(`[materialize ${meetingId}] idempotency check failed:`, existingErr.message);
    throw new Error(`materializeMeetingPosts: idempotency check failed — ${existingErr.message}`);
  } else if (existing && existing.length > 0) {
    return 0;
  }

  const messages = await listMessages(meetingId);
  const contentTurns: MeetingMessageRow[] = messages.filter(
    (m) =>
      m.sender === "content_agent" &&
      m.role === "assistant" &&
      (m.metadata as { kind?: string } | null)?.kind !== "agent_error",
  );

  if (contentTurns.length === 0) {
    await logAgent({
      agent: "meeting",
      action: "meeting.materialize",
      status: "error",
      error: "no content_agent turns to materialize",
    });
    return 0;
  }

  const fullText = contentTurns.map((m) => m.content).join("\n\n");
  const blocks = parseContentBlocks(fullText);

  if (blocks.length === 0) {
    await logAgent({
      agent: "meeting",
      action: "meeting.materialize",
      status: "error",
      error: "parser returned 0 blocks despite content_agent turns existing",
      output: fullText.slice(0, 2000),
    });
    return 0;
  }

  let inserted = 0;
  const now = new Date().toISOString();

  for (const block of blocks) {
    const publishable = renderPublishableText(block);
    const { error } = await supabase.from("posts").insert({
      agent: "content",
      type: block.type,
      content: publishable,
      status: "pending",
      metadata: {
        ...block,
        source_meeting_id: meetingId,
        materialized_at: now,
      },
    });

    if (error) {
      console.error(
        `[materialize ${meetingId}] insert "${block.title}" failed:`,
        error.message,
      );
      continue;
    }
    inserted++;
  }

  await logAgent({
    agent: "meeting",
    action: "meeting.materialize",
    status: inserted > 0 ? "success" : "error",
    output: `inserted ${inserted}/${blocks.length} post(s) from meeting ${meetingId}`,
  });

  return inserted;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

const HOOK_VARIANTS = ["medo_perda", "dados_frios", "ironia_mercado"] as const;

/**
 * Splits a content_agent transcript into `[POST ...]` blocks and parses each.
 * Tolerant of formatting drift from the LLM: missing fields default to empty,
 * never throws on a single bad block.
 */
export function parseContentBlocks(text: string): ParsedPost[] {
  const headerRe = /\[POST\s+([^\]]+)\]/gi;
  const matches = [...text.matchAll(headerRe)];
  if (matches.length === 0) return [];

  const posts: ParsedPost[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    const headerInner = m[1]!.trim();
    const bodyStart = m.index! + m[0].length;
    const bodyEnd = i + 1 < matches.length ? matches[i + 1]!.index! : text.length;
    const blockBody = text.slice(bodyStart, bodyEnd);
    const rawBlock = text.slice(m.index!, bodyEnd);

    const type = detectType(headerInner);
    const parsed = parsePostBody(blockBody, type, rawBlock, headerInner);
    posts.push(parsed);
  }

  return posts;
}

function detectType(headerInner: string): ParsedPost["type"] {
  const h = headerInner.toLowerCase();
  if (h.includes("pilar") || h.includes("carrossel") || h.includes("carousel")) return "carousel";
  if (h.includes("stories")) return "stories";
  return "post_unico";
}

function parsePostBody(
  body: string,
  type: ParsedPost["type"],
  rawBlock: string,
  headerInner: string,
): ParsedPost {
  const title = extractInline(body, /T[íi]tulo\s*:\s*(.+)/i) ?? deriveFallbackTitle(headerInner);

  const hooks: ParsedPost["hooks"] = [];
  for (const variant of HOOK_VARIANTS) {
    const re = new RegExp(`${variant}\\s*:\\s*(.+)`, "i");
    const txt = extractInline(body, re);
    if (txt) hooks.push({ variant, text: stripBulletMarkers(txt) });
  }

  const visual_direction = extractSection(body, /Visual\s*:\s*/i) ?? "";

  let parsedBody: string | string[];
  if (type === "carousel") {
    parsedBody = extractSlides(body);
  } else if (type === "stories") {
    parsedBody = extractFrames(body);
  } else {
    const bodySection = extractSection(body, /Body\s*:\s*/i) ?? "";
    parsedBody = bodySection.trim();
  }

  const call_to_action = extractInline(body, /CTA\s*:\s*(.+)/i) ?? "";

  const hashtagsLine = extractInline(body, /Hashtags?\s*:\s*(.+)/i) ?? "";
  const hashtags = hashtagsLine
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.startsWith("#"));

  return {
    type,
    title: truncate(title, 255),
    hooks,
    body: parsedBody,
    visual_direction: visual_direction.trim(),
    call_to_action,
    hashtags,
    raw_block: rawBlock,
  };
}

/** Extract the first capture group from a single-line regex match. */
function extractInline(body: string, re: RegExp): string | null {
  const m = body.match(re);
  return m && m[1] ? m[1].trim() : null;
}

/**
 * Extract a multi-line section starting at `startRe`, ending at the next
 * field heading (Slides:, Body:, CTA:, Hashtags:, Visual:, or block break).
 */
function extractSection(body: string, startRe: RegExp): string | null {
  const startMatch = body.match(startRe);
  if (!startMatch || startMatch.index === undefined) return null;
  const after = body.slice(startMatch.index + startMatch[0].length);
  // Stop at the next labelled field, the next [POST block, or end of input.
  const stopRe = /\n\s*(?:Slides\s*[^:]*:|Body\s*:|CTA\s*:|Hashtags?\s*:|Hooks\s*:|T[íi]tulo\s*:|Visual\s*:|\[POST\s)/i;
  const stop = after.search(stopRe);
  const section = stop === -1 ? after : after.slice(0, stop);
  return section.trim();
}

function extractSlides(body: string): string[] {
  const section = extractSection(body, /Slides[^:\n]*:\s*/i) ?? "";
  if (!section) return [];
  // Lines that look like "Slide N: ..." — collect each as one slide entry.
  const lines = section.split("\n");
  const slides: string[] = [];
  let current: string | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^\s*[*-]?\s*slide\s*\d+/i.test(line)) {
      if (current !== null) slides.push(current.trim());
      current = line.replace(/^\s*[*-]?\s*/, "");
    } else if (current !== null && line.trim().length > 0) {
      current += "\n" + line;
    }
  }
  if (current !== null) slides.push(current.trim());
  return slides.length > 0 ? slides : [section];
}

function extractFrames(body: string): string[] {
  const section = extractSection(body, /Body\s*:\s*/i) ?? "";
  if (!section) return [];
  // Frames can be separated by " | ", newlines, or "Frame N:" markers.
  const byFrameMarker = section.split(/\n?\s*(?:[*-]\s*)?Frame\s*\d+\s*:\s*/i).map((s) => s.trim()).filter(Boolean);
  if (byFrameMarker.length >= 2) return byFrameMarker;
  const byPipe = section.split(/\s*\|\s*/).map((s) => s.trim()).filter((s) => s.length > 0);
  if (byPipe.length >= 2) return byPipe;
  // Fallback: split by blank line.
  const byBlank = section.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  return byBlank.length > 0 ? byBlank : [section];
}

function stripBulletMarkers(s: string): string {
  return s.replace(/^[\s•\-*>]+/, "").trim();
}

function deriveFallbackTitle(headerInner: string): string {
  // Header looks like "PILAR — CARROSSEL" or "SATÉLITE 1 — STORIES".
  return headerInner.replace(/\s+/g, " ").trim().slice(0, 255);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

/**
 * Builds the publishable text that ends up in `posts.content`. Mirrors the
 * shape used by `runContentAgent.serializeContent` so downstream consumers
 * (approval UI, Discord embeds) see a consistent layout.
 */
export function renderPublishableText(block: ParsedPost): string {
  const hook = block.hooks[0]?.text ?? "";
  const bodyText = Array.isArray(block.body) ? block.body.join("\n\n---\n\n") : block.body;
  const tags = block.hashtags.length > 0 ? `\n\n${block.hashtags.join(" ")}` : "";
  return [hook, bodyText, block.call_to_action]
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0)
    .join("\n\n") + tags;
}
