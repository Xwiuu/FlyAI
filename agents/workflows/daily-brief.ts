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

  // 1. Research + pending posts + metrics — all three fetched in parallel (research is
  //    tolerant: brief ships even if it fails; metrics are best-effort).
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const weekAgoIso = weekAgo.toISOString();

  let research: ResearchOutput | null = null;
  let research_error: string | undefined;

  const [researchResult, pendingResult, metricsResult] = await Promise.allSettled([
    runResearchAgent(date),
    supabase
      .from("posts")
      .select("id, type, content")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("metrics")
      .select("platform, metric_name, value")
      .gte("collected_at", weekAgoIso),
  ]);

  if (researchResult.status === "fulfilled") {
    research = researchResult.value;
  } else {
    research_error = researchResult.reason instanceof Error
      ? researchResult.reason.message
      : String(researchResult.reason);
  }

  if (pendingResult.status === "rejected") {
    throw new Error(`daily-brief: load pending failed — ${pendingResult.reason}`);
  }
  const { data: pending, error: pendingErr } = pendingResult.value;
  if (pendingErr) throw new Error(`daily-brief: load pending failed — ${pendingErr.message}`);

  const pending_posts = (pending ?? []).map((p) => ({
    id: p.id,
    type: p.type,
    preview: String(p.content).slice(0, 200),
  }));

  // 2. Build a compact metrics summary string for the CEO Agent.
  let metrics_summary: string | null = null;
  if (metricsResult.status === "fulfilled" && !metricsResult.value.error) {
    const rows = metricsResult.value.data ?? [];
    if (rows.length > 0) {
      // Aggregate by platform+metric_name.
      const agg: Record<string, number> = {};
      for (const r of rows) {
        const key = `${r.platform}/${r.metric_name}`;
        agg[key] = (agg[key] ?? 0) + Number(r.value);
      }
      metrics_summary = Object.entries(agg)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
    }
  }

  // 3. CEO consolidation.
  const ceo = await runCeoAgent({
    date,
    research,
    research_error,
    pending_posts,
    metrics_summary,
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
