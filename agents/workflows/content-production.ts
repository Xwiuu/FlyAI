import { runContentAgent, type ContentType } from "../agents/content-agent.js";
import { approvalLink, postWebhook } from "../lib/discord.js";
import { isMain, runCli } from "./_cli.js";

export interface ContentProductionInput {
  type: ContentType;
  briefing: string;
  notifyDiscord?: boolean;
}

export async function runContentProduction(input: ContentProductionInput) {
  const result = await runContentAgent({
    type: input.type,
    briefing: input.briefing,
    persist: true,
  });

  if (input.notifyDiscord && result.post_id) {
    await postWebhook({
      title: `Novo post (${result.output.type}) pendente`,
      summary: [result.output.title, "", "Aprovar no dashboard:", approvalLink(result.post_id)].join("\n"),
      link: approvalLink(result.post_id),
    });
  }

  return result;
}

if (isMain(import.meta.url)) {
  runCli("content-production", async () => {
    const briefing = process.env.BRIEFING ?? "Gere um post sobre orquestração de agentes em SaaS B2B.";
    const type = (process.env.CONTENT_TYPE as ContentType | undefined) ?? "linkedin";
    return runContentProduction({ type, briefing, notifyDiscord: true });
  });
}
