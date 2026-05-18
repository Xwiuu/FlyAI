import { runResearchWeeklyAgent } from "../agents/research-weekly-agent.js";
import { isMain, runCli } from "./_cli.js";

function mondayOf(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export async function runResearchWeeklyWorkflow(): Promise<{
  plan_id: string;
  gaps: number;
  angles: number;
  satellites: number;
}> {
  const theme = process.env.THEME ?? "agentes autônomos em operações B2B";
  const weekOf = process.env.WEEK_OF ?? mondayOf(new Date());
  const { plan, plan_id } = await runResearchWeeklyAgent({ theme, weekOf });
  return {
    plan_id,
    gaps: plan.market_gaps.length,
    angles: plan.angles.length,
    satellites: plan.weekly_plan.satellites.length,
  };
}

if (isMain(import.meta.url)) {
  runCli("research-weekly", runResearchWeeklyWorkflow);
}
