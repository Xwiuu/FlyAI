import { runResearchAgent } from "../agents/research-agent.js";
import { runContentAgent } from "../agents/content-agent.js";
import { runAnalyticsAgent } from "../agents/analytics-agent.js";
import { approvalLink, postWebhook } from "../lib/discord.js";
import { isMain, runCli } from "./_cli.js";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function runWeeklyPlanning(): Promise<{
  generated_posts: number;
  research_topics: number;
  analytics_ok: boolean;
}> {
  const end = daysAgo(0);
  const start = daysAgo(7);

  // 1. Analytics for the previous week.
  const report = await runAnalyticsAgent({ start, end });

  // 2. Research signals.
  const research = await runResearchAgent(end.toISOString().slice(0, 10));

  // 3. Produce 3 posts from the top research topics (relevance-ranked).
  const top = [...research.topics].sort((a, b) => b.relevance - a.relevance).slice(0, 3);

  const generated: string[] = [];
  for (const t of top) {
    const result = await runContentAgent({
      type: "linkedin",
      briefing: `Tópico: ${t.topic}\nResumo: ${t.summary}\nFonte: ${t.source_url}`,
      persist: true,
    });
    if (result.post_id) generated.push(result.post_id);
  }

  // 4. Notify Discord with summary + first approval link.
  await postWebhook({
    title: "Weekly planning entregue",
    summary: [
      `Analytics integridade: ${report.integrity_ok ? "OK" : "FALHA"}`,
      `Research: ${research.topics.length} sinais`,
      `Posts gerados (pendentes): ${generated.length}`,
      "",
      generated[0] ? `Primeiro: ${approvalLink(generated[0])}` : "",
    ].join("\n"),
  });

  return {
    generated_posts: generated.length,
    research_topics: research.topics.length,
    analytics_ok: report.integrity_ok,
  };
}

if (isMain(import.meta.url)) {
  runCli("weekly-planning", runWeeklyPlanning);
}
