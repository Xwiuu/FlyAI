import { runLLM } from "../lib/llm-router.js";
import { serviceClient } from "../lib/supabase.js";
import { logAgent } from "../lib/logger.js";

export interface PromptAgentInput {
  post_copy: string;
  post_title: string;
  format: string;
  weekly_thesis: string | null;
}

interface BrandStyleContext {
  primary_color: string | null;
  secondary_color: string | null;
  dark_color: string | null;
  font_family: string | null;
  visual_style_notes: string | null;
}

interface InspirationRow {
  category_tags: string[];
  format: string;
}

const SYSTEM_PROMPT = `You are a Senior Visual Prompt Engineer specializing in Dark Premium Branding for Tech/SaaS companies.
Your ONLY output is a technical image prompt in English, ready to be sent directly to Imagen 3.

GOLDEN RULE — FORBIDDEN CONCEPTS (never generate any of these):
- Planets, Earth from space, starfields, galaxies
- Physical server racks, data centers, literal hardware
- Circuit boards, motherboards, PCBs
- Humanoid robots, android figures, AI with a face or body
- Exposed digital brains, glowing neurons, synaptic network illustrations
- Generic globes or spheres with network connection lines overlaid
- Abstract purple or blue particle waves, generic "data stream" visuals

REQUIRED CONCEPT TRANSLATION — always map abstract ideas to real graphic design elements:
- "orchestration" → minimalist node-graph schematic, procedural network topology diagram
- "automation" → clean geometric flow diagram, abstract pipeline visualization
- "intelligence" → sparse data constellation, refined signal waveform, precision analytics grid
- "scale" → layered typographic grid system, abstract compression / reduction visual
- "efficiency" → negative space composition, surgical single-element focal study
- "agents" → abstract process graph, autonomous workflow diagram, modular system architecture art
- "data" → minimalist data table fragment, abstract density plot, precision chart element
- "growth" → ascending abstract bar chart fragment, geometric progression pattern
- "pipeline" → clean directed-graph layout, abstract dependency tree schematic

MANDATORY AESTHETIC (non-negotiable in every prompt):
- Background: matte black #0A0A0A or deep charcoal — zero gradients, zero noise
- Single accent color: emerald (#00D084) OR amber (#F5C518) glow — never both
- Lighting: cinematographic chiaroscuro, one strong directional rim light, deep dramatic shadows
- Composition: single strong focal point, deliberate negative space, editorial breathing room
- Typography: if text is included — geometric bold sans-serif, wide tracking, uppercase
- Style reference: Monocle magazine cover, Bloomberg Businessweek art direction, Linear.app marketing

OUTPUT FORMAT:
Return ONLY the English image prompt. Nothing else.
- Length: 60–120 words
- No JSON, no markdown, no preamble, no explanation after the prompt
- Begin directly with the visual description
- Be highly specific — no vague adjectives like "beautiful", "stunning", "futuristic"`;

async function fetchBrandStyle(): Promise<BrandStyleContext | null> {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("brand_vault")
    .select("primary_color, secondary_color, dark_color, font_family, visual_style_notes")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as BrandStyleContext | null;
}

async function fetchInspirationPatterns(format: string): Promise<string[]> {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("inspiration_bank")
    .select("category_tags, format")
    .order("created_at", { ascending: false });

  if (!data) return [];

  const rows = data as InspirationRow[];
  const relevant = rows.filter((r) => r.format === format || r.format === "single_post");
  const allTags = relevant.flatMap((r) => r.category_tags);
  return [...new Set(allTags)].slice(0, 12);
}

function buildUserMessage(
  input: PromptAgentInput,
  brand: BrandStyleContext | null,
  patterns: string[],
): string {
  const brandSection = brand
    ? [
        "── CONFIRMED BRAND IDENTITY ──",
        brand.primary_color && `Primary accent: ${brand.primary_color}`,
        brand.secondary_color && `Secondary: ${brand.secondary_color}`,
        brand.dark_color && `Background: ${brand.dark_color}`,
        brand.font_family && `Typography system: ${brand.font_family}`,
        brand.visual_style_notes && `Style mandate: ${brand.visual_style_notes}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "── CONFIRMED BRAND IDENTITY ──\nPalette: amber #F5C518 on matte black #0A0A0A. Dark premium corporate.";

  const patternsSection =
    patterns.length > 0
      ? `── SUCCESSFUL AESTHETIC PATTERNS (from curated inspiration bank) ──\n${patterns.join(", ")}`
      : "";

  const thesisSection = input.weekly_thesis
    ? `── MACRO THESIS OF THE WEEK ──\n${input.weekly_thesis}`
    : "";

  return [
    `── POST TO VISUALIZE (format: ${input.format}) ──`,
    `Title: ${input.post_title}`,
    "",
    input.post_copy,
    "",
    brandSection,
    "",
    patternsSection,
    "",
    thesisSection,
    "",
    "── YOUR TASK ──",
    "1. Read the post above and identify its SINGLE core concept.",
    "2. Choose the most powerful visual metaphor for that concept using real graphic design elements — never literal illustrations.",
    "3. Output ONLY the Imagen 3 prompt in English. Start immediately with the visual description.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateRefinedPrompt(
  input: PromptAgentInput,
): Promise<string> {
  const [brand, patterns] = await Promise.all([
    fetchBrandStyle(),
    fetchInspirationPatterns(input.format),
  ]);

  const userMessage = buildUserMessage(input, brand, patterns);

  const res = await runLLM({
    task: "visual_prompt",
    agent: "content",
    action: "prompt-agent.generate",
    system: SYSTEM_PROMPT,
    prompt: userMessage,
    temperature: 0.4,
    maxTokens: 512,
  });

  const refined = res.text.trim();

  await logAgent({
    agent: "content",
    action: "prompt-agent.generate",
    status: "success",
    output: refined,
    tokens_used: res.tokens_used,
  });

  return refined;
}
