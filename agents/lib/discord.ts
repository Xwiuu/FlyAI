import { env } from "./env.js";

export interface DiscordEmbedInput {
  title: string;
  summary: string;
  link?: string;
  /** Hex color int, e.g. 0x9aa0a6. Defaults to neutral gray. */
  color?: number;
}

/**
 * Posts a single embed to the configured Discord webhook. Never throws —
 * cron jobs must not crash because Discord is down.
 */
export async function postWebhook(input: DiscordEmbedInput): Promise<boolean> {
  try {
    const embed: Record<string, unknown> = {
      title: input.title,
      description: input.summary.slice(0, 4000),
      color: input.color ?? 0x9aa0a6,
    };
    if (input.link) embed.url = input.link;

    const res = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
      console.error(`[discord] webhook ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[discord] post failed:", err);
    return false;
  }
}

export function approvalLink(focusId: string): string {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/agentes?focus=${focusId}`;
}
