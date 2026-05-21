import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const cache = new Map<string, string>();

async function read(relPath: string): Promise<string> {
  const cached = cache.get(relPath);
  if (cached) return cached;
  const abs = join(ROOT, relPath);
  const text = await readFile(abs, "utf8");
  cache.set(relPath, text);
  return text;
}

const REPO_ROOT = join(ROOT, "..");

/** Loads FLY.md from repo root (Brand Bible). */
export async function loadBrandBible(): Promise<string> {
  const cached = cache.get("__FLY_MD__");
  if (cached) return cached;
  const text = await readFile(join(REPO_ROOT, "FLY.md"), "utf8");
  cache.set("__FLY_MD__", text);
  return text;
}

export type SystemPromptName =
  | "research"
  | "research-weekly"
  | "content"
  | "analytics"
  | "ceo"
  | "devils-advocate"
  | "creative-director"
  | "creative-critic";

/** Returns the system prompt for an agent, prefixed with the shared brand rules. */
export async function loadSystemPrompt(agent: SystemPromptName): Promise<string> {
  const [brand, body] = await Promise.all([
    read("system-prompts/_brand-rules.md"),
    read(`system-prompts/${agent}-agent.md`),
  ]);
  return `${brand}\n\n---\n\n${body}`;
}

export async function loadSkill(name: string): Promise<string> {
  return read(`skills/${name}.md`);
}
