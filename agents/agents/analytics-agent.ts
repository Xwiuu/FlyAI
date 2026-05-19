import { runLLM } from "../lib/llm-router.js";
import { loadSystemPrompt } from "../lib/prompts.js";
import { logAgent } from "../lib/logger.js";
import { serviceClient } from "../lib/supabase.js";
import { assertEquals, safeRate, safeSum } from "../lib/math.js";
import { postCrisisAlert } from "../lib/discord.js";

/** Minimum acceptable engagement/reach ratio for Instagram. Below this, a
 *  crisis embed is dispatched. Kept conservative — false positives are
 *  cheaper than missing a real drop. */
const INSTAGRAM_CONVERSION_FLOOR = 0.005;

type Platform = "instagram" | "linkedin";

interface MetricRow {
  platform: Platform;
  metric_name: string;
  value: number;
  collected_at: string;
}

interface PlatformAggregate {
  platform: Platform;
  totals: Record<string, number>;
  /** conversion ≡ engagement / reach — null when reach is 0 or missing. */
  conversion_rate: number | null;
  sample_size: number;
}

export interface AnalyticsReport {
  window: { start: string; end: string };
  integrity_ok: boolean;
  integrity_notes: string[];
  per_platform: PlatformAggregate[];
  markdown: string;
}

const PLATFORMS: Platform[] = ["instagram", "linkedin"];

export async function runAnalyticsAgent(opts: {
  start: Date;
  end: Date;
}): Promise<AnalyticsReport> {
  const startIso = opts.start.toISOString();
  const endIso = opts.end.toISOString();
  const supabase = serviceClient();
  const integrity_notes: string[] = [];
  let integrity_ok = true;

  // -- Pull raw rows for the window. We re-filter in JS to catch any log row
  //    whose collected_at is technically outside [start, end) (anomaly guard).
  const { data: rawRows, error: rawErr } = await supabase
    .from("metrics")
    .select("platform, metric_name, value, collected_at")
    .gte("collected_at", startIso)
    .lt("collected_at", endIso);

  if (rawErr) throw new Error(`analytics: fetch metrics failed — ${rawErr.message}`);

  const rows: MetricRow[] = (rawRows ?? []).filter((r): r is MetricRow => {
    const t = new Date(r.collected_at).getTime();
    const inside = t >= opts.start.getTime() && t < opts.end.getTime();
    if (!inside) integrity_notes.push(`discarded row outside window: ${r.collected_at}`);
    return inside && (r.platform === "instagram" || r.platform === "linkedin");
  });

  const per_platform: PlatformAggregate[] = [];

  for (const platform of PLATFORMS) {
    const platRows = rows.filter((r) => r.platform === platform);

    // Sum-by-metric in JS.
    const totals: Record<string, number> = {};
    for (const r of platRows) {
      totals[r.metric_name] = (totals[r.metric_name] ?? 0) + Number(r.value);
    }

    // Cross-check against Postgres SUM() per metric_name.
    for (const metric_name of Object.keys(totals)) {
      const { data: agg, error: aggErr } = await supabase
        .from("metrics")
        .select("value.sum()")
        .eq("platform", platform)
        .eq("metric_name", metric_name)
        .gte("collected_at", startIso)
        .lt("collected_at", endIso)
        .single();

      if (aggErr) {
        integrity_ok = false;
        integrity_notes.push(`agg query failed for ${platform}/${metric_name}: ${aggErr.message}`);
        continue;
      }

      const dbSum = Number((agg as unknown as { sum: number | null }).sum ?? 0);
      const jsSum = totals[metric_name] ?? 0;
      try {
        assertEquals(jsSum, dbSum, `${platform}/${metric_name}`);
      } catch (err) {
        integrity_ok = false;
        integrity_notes.push((err as Error).message);
      }
    }

    per_platform.push({
      platform,
      totals,
      conversion_rate: safeRate(totals["engagement"], totals["reach"]),
      sample_size: platRows.length,
    });
  }

  // -- Anomaly detection: dispatch red Discord alert when something is on fire.
  //    Threshold: Instagram conversion < 0.5% OR integrity check failed.
  await detectAndAlertAnomalies({ per_platform, integrity_ok, integrity_notes, startIso, endIso });

  // Build the input for the LLM (structured, pre-validated).
  const briefing = {
    window: { start: startIso, end: endIso },
    integrity_ok,
    integrity_notes,
    per_platform,
    totals_sanity: safeSum(per_platform.flatMap((p) => Object.values(p.totals))),
  };

  const system = await loadSystemPrompt("analytics");
  const prompt = [
    "Insumo pré-validado (não recalcule, não invente):",
    "```json",
    JSON.stringify(briefing, null, 2),
    "```",
    "",
    "Produza o relatório markdown conforme o schema do system prompt.",
    "Se integrity_ok=false, escreva um aviso destacado no topo.",
    "Conversion rate null DEVE ser exibida como '—', nunca 0%.",
  ].join("\n");

  const res = await runLLM({
    task: "analytics",
    agent: "analytics",
    action: "analytics.weekly",
    system,
    prompt,
    temperature: 0.2,
    maxTokens: 2048,
  });

  await logAgent({
    agent: "analytics",
    action: "analytics.weekly.report",
    status: integrity_ok ? "success" : "error",
    output: res.text,
    error: integrity_ok ? null : integrity_notes.join("; "),
    tokens_used: res.tokens_used,
  });

  return {
    window: { start: startIso, end: endIso },
    integrity_ok,
    integrity_notes,
    per_platform,
    markdown: res.text,
  };
}

interface AnomalyContext {
  per_platform: PlatformAggregate[];
  integrity_ok: boolean;
  integrity_notes: string[];
  startIso: string;
  endIso: string;
}

async function detectAndAlertAnomalies(ctx: AnomalyContext): Promise<void> {
  const anomalies: string[] = [];
  const ig = ctx.per_platform.find((p) => p.platform === "instagram");

  if (ig && ig.conversion_rate !== null && ig.conversion_rate < INSTAGRAM_CONVERSION_FLOOR) {
    anomalies.push(
      `Instagram conversion rate ${(ig.conversion_rate * 100).toFixed(2)}% < ${(INSTAGRAM_CONVERSION_FLOOR * 100).toFixed(1)}% threshold`,
    );
  }

  if (!ctx.integrity_ok) {
    anomalies.push(
      `Integridade de métricas falhou — ${ctx.integrity_notes.length} inconsistência(s)`,
    );
  }

  if (anomalies.length === 0) return;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  await postCrisisAlert({
    title: "Anomalia detectada — Instagram",
    summary: anomalies.map((a) => `• ${a}`).join("\n"),
    fields: [
      {
        name: "Janela",
        value: `${ctx.startIso.slice(0, 10)} → ${ctx.endIso.slice(0, 10)}`,
        inline: true,
      },
      { name: "Reach", value: String(ig?.totals["reach"] ?? 0), inline: true },
      { name: "Engagement", value: String(ig?.totals["engagement"] ?? 0), inline: true },
    ],
    link: appUrl ? `${appUrl}/agentes` : undefined,
  });

  await logAgent({
    agent: "analytics",
    action: "analytics.crisis_alert",
    status: "success",
    output: anomalies.join("; "),
  });
}
