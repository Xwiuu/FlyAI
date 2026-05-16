import { runResearchAgent, type ResearchOutput } from "../agents/research-agent.js";
import { runCeoAgent } from "../agents/ceo-agent.js";
import { serviceClient } from "../lib/supabase.js";
import { approvalLink, postWebhook } from "../lib/discord.js";
import { isMain, runCli } from "./_cli.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function runDailyBrief(): Promise<{ brief_id: string; pending: number }> {
  const date = today();
  const supabase = serviceClient();

  // 1. Research (tolerant: brief still ships if it fails).
  let research: ResearchOutput | null = null;
  let research_error: string | undefined;
  try {
    research = await runResearchAgent(date);
  } catch (err) {
    research_error = err instanceof Error ? err.message : String(err);
  }

  // 2. Pending posts queue.
  const { data: pending, error: pendingErr } = await supabase
    .from("posts")
    .select("id, type, content")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);

  if (pendingErr) throw new Error(`daily-brief: load pending failed — ${pendingErr.message}`);

  const pending_posts = (pending ?? []).map((p) => ({
    id: p.id,
    type: p.type,
    preview: String(p.content).slice(0, 200),
  }));

  // 3. CEO consolidation.
  const ceo = await runCeoAgent({
    date,
    research,
    research_error,
    pending_posts,
  });

  // 4. Discord notification.
  await postWebhook({
    title: `Daily Brief — ${date}`,
    summary: [
      research_error ? `⚠ Research falhou: ${research_error}` : `Sinais: ${research?.topics.length ?? 0}`,
      `Aprovações pendentes: ${pending_posts.length}`,
      "",
      "Abrir brief no dashboard:",
      approvalLink(ceo.brief_id),
    ].join("\n"),
    link: approvalLink(ceo.brief_id),
  });

  return { brief_id: ceo.brief_id, pending: pending_posts.length };
}

if (isMain(import.meta.url)) {
  runCli("daily-brief", runDailyBrief);
}
