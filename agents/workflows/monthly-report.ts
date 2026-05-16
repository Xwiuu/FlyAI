import { runAnalyticsAgent } from "../agents/analytics-agent.js";
import { serviceClient } from "../lib/supabase.js";
import { postWebhook } from "../lib/discord.js";
import { isLastFridayOfMonth, safeSum } from "../lib/math.js";
import { isMain, runCli } from "./_cli.js";

export async function runMonthlyReport(now: Date = new Date()): Promise<{
  skipped: boolean;
  reason?: string;
  mrr?: number;
  net?: number;
  active_clients?: number;
}> {
  // Guard: GitHub Actions cron fires every Friday — we only run on the last one.
  if (!isLastFridayOfMonth(now)) {
    return { skipped: true, reason: "not the last Friday of the month" };
  }

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const supabase = serviceClient();

  // Analytics covers the full month.
  const analytics = await runAnalyticsAgent({ start: monthStart, end: nextMonth });

  // Financial roll-up.
  const { data: txs, error: txErr } = await supabase
    .from("transactions")
    .select("type, amount")
    .gte("date", monthStart.toISOString().slice(0, 10))
    .lt("date", nextMonth.toISOString().slice(0, 10));
  if (txErr) throw new Error(`monthly: transactions failed — ${txErr.message}`);

  const income = safeSum((txs ?? []).filter((t) => t.type === "income").map((t) => Number(t.amount)));
  const expense = safeSum((txs ?? []).filter((t) => t.type === "expense").map((t) => Number(t.amount)));
  const net = income - expense;

  const { data: clients, error: clErr } = await supabase
    .from("clients")
    .select("ticket, status")
    .eq("status", "active");
  if (clErr) throw new Error(`monthly: clients failed — ${clErr.message}`);

  const mrr = safeSum((clients ?? []).map((c) => Number(c.ticket)));
  const active_clients = (clients ?? []).length;

  await postWebhook({
    title: `Relatório mensal — ${monthStart.toISOString().slice(0, 7)}`,
    summary: [
      `MRR ativo: R$ ${mrr.toLocaleString("pt-BR")}`,
      `Clientes ativos: ${active_clients}`,
      `Receita do mês: R$ ${income.toLocaleString("pt-BR")}`,
      `Despesa do mês: R$ ${expense.toLocaleString("pt-BR")}`,
      `Resultado: R$ ${net.toLocaleString("pt-BR")}`,
      `Analytics integridade: ${analytics.integrity_ok ? "OK" : "FALHA"}`,
    ].join("\n"),
  });

  return { skipped: false, mrr, net, active_clients };
}

if (isMain(import.meta.url)) {
  runCli("monthly-report", () => runMonthlyReport());
}
