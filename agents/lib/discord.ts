import { env } from "./env.js";

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbedInput {
  title: string;
  summary: string;
  link?: string;
  /** Hex color int, e.g. 0x9aa0a6. Defaults to neutral gray. */
  color?: number;
  /** Discord embed fields (key/value pills). */
  fields?: DiscordEmbedField[];
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
    if (input.fields && input.fields.length > 0) {
      embed.fields = input.fields.slice(0, 25).map((f) => ({
        name: f.name.slice(0, 256),
        value: f.value.slice(0, 1024),
        inline: f.inline ?? false,
      }));
    }

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

export interface CrisisAlertInput {
  title: string;
  summary: string;
  fields?: DiscordEmbedField[];
  link?: string;
}

/**
 * Red, high-urgency embed for anomalies detected by the agent fleet.
 * Distinct from the neutral `postWebhook` color so a glance separates
 * a regular daily-brief drop from "something is on fire".
 */
export async function postCrisisAlert(input: CrisisAlertInput): Promise<boolean> {
  return postWebhook({
    title: `🚨 ${input.title}`,
    summary: input.summary,
    color: 0xff2d2d,
    fields: input.fields,
    link: input.link,
  });
}

export function approvalLink(focusId: string): string {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/agentes?focus=${encodeURIComponent(focusId)}`;
}
