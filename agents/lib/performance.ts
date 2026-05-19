import { serviceClient } from "./supabase.js";

export interface TopPerformer {
  post_id: string;
  type: string;
  content_excerpt: string;
  engagement_rate: number;
  dm_clicks: number;
  logged_at: string;
}

export interface GetTopPerformingOptions {
  limit?: number;     // default 5
  sinceDays?: number; // default 60
  type?: "carousel" | "stories" | "post_unico";
}

const EXCERPT_CHARS = 180;

/**
 * Returns the top-engagement posts within the last `sinceDays`. Used by
 * research-weekly-agent to ground new theses in what already converted.
 *
 * Reads `content_performance_logs` joined with `posts` (status approved or
 * published). Falls back to an empty list on error — the research pass must
 * keep working even if the memory layer is unavailable.
 */
export async function getTopPerformingPosts(
  opts: GetTopPerformingOptions = {},
): Promise<TopPerformer[]> {
  const limit = opts.limit ?? 5;
  const sinceDays = opts.sinceDays ?? 60;
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const supabase = serviceClient();
    let query = supabase
      .from("content_performance_logs")
      .select(
        "post_id, engagement_rate, dm_clicks, logged_at, posts!inner(type, content, status)",
      )
      .gte("logged_at", since)
      .not("engagement_rate", "is", null)
      .in("posts.status", ["approved", "published"])
      .order("engagement_rate", { ascending: false })
      .limit(limit);

    if (opts.type) query = query.eq("posts.type", opts.type);

    const { data, error } = await query;
    if (error || !data) {
      console.error("[performance] fetch failed:", error?.message);
      return [];
    }

    type Row = {
      post_id: string;
      engagement_rate: number | null;
      dm_clicks: number | null;
      logged_at: string;
      posts: { type: string; content: string } | { type: string; content: string }[];
    };

    return (data as unknown as Row[]).map((r) => {
      const post = Array.isArray(r.posts) ? r.posts[0]! : r.posts;
      const excerpt = (post.content ?? "")
        .replace(/\s+/g, " ")
        .slice(0, EXCERPT_CHARS)
        .trim();
      return {
        post_id: r.post_id,
        type: post.type,
        content_excerpt: excerpt + (excerpt.length >= EXCERPT_CHARS ? "…" : ""),
        engagement_rate: Number(r.engagement_rate ?? 0),
        dm_clicks: Number(r.dm_clicks ?? 0),
        logged_at: r.logged_at,
      };
    });
  } catch (err) {
    console.error("[performance] unexpected error:", err);
    return [];
  }
}
