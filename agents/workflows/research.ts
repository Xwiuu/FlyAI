import { runResearchAgent } from "../agents/research-agent.js";
import { isMain, runCli } from "./_cli.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function runResearchWorkflow(): Promise<{ topics: number }> {
  const out = await runResearchAgent(today());
  return { topics: out.topics.length };
}

if (isMain(import.meta.url)) {
  runCli("research", runResearchWorkflow);
}
