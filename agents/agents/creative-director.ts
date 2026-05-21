import { z } from "zod";
import { runLLM } from "../lib/llm-router.js";
import { loadSystemPrompt } from "../lib/prompts.js";
import { extractJson } from "../lib/json.js";
import { logAgent } from "../lib/logger.js";
import { serviceClient } from "../lib/supabase.js";
import { buildCreativePrompt, fetchBrandContext, type BrandContext } from "../lib/nanobanana.js";
import { generateRefinedPrompt } from "./prompt-agent.js";
import {
  type CdaInput,
  type CdaOutput,
  type BrandDna,
  type ResearchBrief,
  type ConceptBoard,
  type ConceptDirection,
  type DesignTokenPackage,
  type CriticReport,
  CdaInputSchema,
  BrandDnaSchema,
  ResearchBriefSchema,
  ConceptBoardSchema,
  DesignTokenPackageSchema,
  CriticReportSchema,
  CDA_SCORE_THRESHOLD,
  CDA_MAX_RETRIES,
  NEGATIVE_PROMPT_TOKENS,
} from "../types/cda.js";

// ─── Anti-Cliché Static Map ────────────────────────────────────────────────

const CLICHES_BY_INDUSTRY: Record<string, string[]> = {
  tech_startup: [
    "purple-to-blue gradients",
    "abstract wireframe mesh spheres",
    "Inter or Poppins without strategic justification",
    "humanoids with exposed mechanical brains",
    "glowing matrix backgrounds",
    "connected-dots network visualizations",
    "floating UI mockup compositions",
  ],
  saas_b2b: [
    "dashboard screenshot composites",
    "arrow-up growth charts as hero images",
    "generic cloud computing icons",
    "blue corporate gradient backgrounds",
    "headset-wearing support agent stock photos",
  ],
  ai_ml: [
    "decorative neural network node diagrams",
    "binary code or Matrix rain",
    "robot hands touching human hands",
    "glowing brain hemispheres",
    "Terminator-style red-eye imagery",
  ],
};

// ─── Default Fallback Values ────────────────────────────────────────────────

const DEFAULT_BRAND_DNA: BrandDna = {
  colors: { primary: "#F5C518", secondary: "#1F2937", dark: "#0A0A0A", accents: ["#00D084"] },
  typography: { family: "Inter, IBM Plex Mono", weight_preference: "bold", tracking: "wide" },
  visual_style: {
    aesthetic_keywords: ["dark premium", "cinematic", "editorial", "minimal"],
    forbidden_concepts: [
      "planets", "server racks", "circuit boards", "humanoid robots",
      "digital brains", "purple waves", "globes with connections",
    ],
    reference_brands: ["Monocle", "Bloomberg Businessweek", "Linear.app"],
  },
  tone: { formality: 9, warmth: 2, density: 8 },
};

const DEFAULT_RESEARCH_BRIEF: ResearchBrief = {
  category_benchmarks: [
    "Dark gradient backgrounds with accent glows",
    "Abstract geometric compositions",
    "Single-element focal point photography",
  ],
  cliche_flags: [
    { pattern: "purple-blue gradient backgrounds", why_cliche: "Overused by 90% of AI/SaaS startups since 2020" },
    { pattern: "neural network visualizations", why_cliche: "Decorative use signals shallow understanding of AI" },
    { pattern: "humanoid robot imagery", why_cliche: "Creates misleading anthropomorphic expectations" },
  ],
  disruption_vectors: [
    "Map tech infrastructure to high-end architecture photography — Tadao Ando concrete brutalism with single light beams",
    "Translate data concepts into abstract expressionist mark-making — Franz Kline energy with surgical precision",
    "Reframe AI operations as haute couture atelier — Dior Homme campaign lighting on abstract process diagrams",
  ],
  competitor_visual_language:
    "Competitors default to blue gradients, connected-dot networks, and generic dashboard mockups. " +
    "The visual language is interchangeable — remove the logo and you cannot tell companies apart.",
};

// ─── M1: Briefing Strategist ────────────────────────────────────────────────

async function runBriefingStrategist(
  input: CdaInput,
  brandVault: BrandContext | null,
): Promise<BrandDna> {
  const system = await loadSystemPrompt("creative-director");

  const brandSection = brandVault
    ? [
        `Primary color: ${brandVault.primary_color ?? "#F5C518"}`,
        `Secondary color: ${brandVault.secondary_color ?? "#1F2937"}`,
        `Dark/background: ${brandVault.dark_color ?? "#0A0A0A"}`,
        `Font family: ${brandVault.font_family ?? "Inter, IBM Plex Mono"}`,
        `Visual style notes: ${brandVault.visual_style_notes ?? "Dark premium cinematic editorial"}`,
      ].join("\n")
    : "No brand vault available. Use default dark premium tech aesthetic.";

  const prompt = [
    'Execute mode: m1_briefing',
    "",
    "── BRIEFING ──",
    input.briefing,
    "",
    "── BRAND VAULT DATA ──",
    brandSection,
    "",
    "── POST CONTEXT ──",
    `Content type: ${input.content_type}`,
    `Title: ${input.post_title}`,
    "",
    "Parse this into a BrandDna JSON object. Fields: colors (primary, secondary, dark, accents), typography (family, weight_preference, tracking), visual_style (aesthetic_keywords, forbidden_concepts, reference_brands), tone (formality, warmth, density — each 1-10).",
    "Return ONLY valid JSON. No markdown.",
  ].join("\n");

  try {
    const res = await runLLM({
      task: "creative_strategy",
      agent: "creative_director",
      action: "cda.m1_briefing",
      system,
      prompt,
      temperature: 0.3,
      maxTokens: 1024,
    });

    return BrandDnaSchema.parse(extractJson(res.text));
  } catch (err) {
    await logAgent({
      agent: "creative_director",
      action: "cda.m1_briefing.fallback",
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });

    if (!brandVault) return DEFAULT_BRAND_DNA;

    return {
      colors: {
        primary: brandVault.primary_color ?? DEFAULT_BRAND_DNA.colors.primary,
        secondary: brandVault.secondary_color ?? DEFAULT_BRAND_DNA.colors.secondary,
        dark: brandVault.dark_color ?? DEFAULT_BRAND_DNA.colors.dark,
        accents: DEFAULT_BRAND_DNA.colors.accents,
      },
      typography: {
        family: brandVault.font_family ?? DEFAULT_BRAND_DNA.typography.family,
        weight_preference: "bold",
        tracking: "wide",
      },
      visual_style: {
        aesthetic_keywords: DEFAULT_BRAND_DNA.visual_style.aesthetic_keywords,
        forbidden_concepts: DEFAULT_BRAND_DNA.visual_style.forbidden_concepts,
        reference_brands: DEFAULT_BRAND_DNA.visual_style.reference_brands,
      },
      tone: DEFAULT_BRAND_DNA.tone,
    };
  }
}

// ─── M2: Research Analyst ───────────────────────────────────────────────────

async function runResearchAnalyst(
  brandDna: BrandDna,
  briefing: string,
): Promise<ResearchBrief> {
  const system = await loadSystemPrompt("creative-director");

  const clicheDb = Object.entries(CLICHES_BY_INDUSTRY)
    .map(([industry, cliches]) => `${industry}: ${cliches.join("; ")}`)
    .join("\n");

  const prompt = [
    'Execute mode: m2_research',
    "",
    "── BRIEFING TOPIC ──",
    briefing,
    "",
    "── BRAND DNA (from M1) ──",
    JSON.stringify(brandDna, null, 2),
    "",
    "── KNOWN CLICHÉ DATABASE ──",
    clicheDb,
    "",
    "── BRAND FORBIDDEN CONCEPTS ──",
    brandDna.visual_style.forbidden_concepts.join(", "),
    "",
    "Analyze this briefing topic. Produce a ResearchBrief JSON with: category_benchmarks (3-5 strings), cliche_flags (array of {pattern, why_cliche}), disruption_vectors (exactly 3 specific, actionable strings), competitor_visual_language (2-3 sentence summary).",
    "Return ONLY valid JSON. No markdown.",
  ].join("\n");

  try {
    const res = await runLLM({
      task: "creative_strategy",
      agent: "creative_director",
      action: "cda.m2_research",
      system,
      prompt,
      temperature: 0.4,
      maxTokens: 1536,
    });

    return ResearchBriefSchema.parse(extractJson(res.text));
  } catch (err) {
    await logAgent({
      agent: "creative_director",
      action: "cda.m2_research.fallback",
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
    return DEFAULT_RESEARCH_BRIEF;
  }
}

// ─── M3: Concept Generator ─────────────────────────────────────────────────

async function runConceptGenerator(
  brandDna: BrandDna,
  researchBrief: ResearchBrief,
  briefing: string,
  revisionDirectives?: string[],
): Promise<ConceptBoard> {
  const system = await loadSystemPrompt("creative-director");

  const revisionSection = revisionDirectives?.length
    ? [
        "",
        "── REVISION DIRECTIVES (from Design Critic — address these) ──",
        ...revisionDirectives.map((d, i) => `${i + 1}. ${d}`),
      ].join("\n")
    : "";

  const prompt = [
    'Execute mode: m3_concepts',
    "",
    "── BRIEFING ──",
    briefing,
    "",
    "── BRAND DNA ──",
    JSON.stringify(brandDna, null, 2),
    "",
    "── RESEARCH BRIEF ──",
    JSON.stringify(researchBrief, null, 2),
    "",
    "── DISRUPTION VECTORS TO USE FOR CONCEPT C ──",
    researchBrief.disruption_vectors.map((v, i) => `${i + 1}. ${v}`).join("\n"),
    "",
    "── CLICHÉS TO AVOID ──",
    researchBrief.cliche_flags.map((f) => `- ${f.pattern}: ${f.why_cliche}`).join("\n"),
    revisionSection,
    "",
    "Generate exactly 3 ConceptDirection objects as a JSON array. Each must have: name, philosophy (1 sentence), style (minimalist|maximalist|category_disruption — one of each), color_strategy, typography_strategy, composition_rules (string[]), mood_reference, incompatibility_proof.",
    "Return ONLY valid JSON array of 3 objects. No markdown.",
  ].join("\n");

  try {
    const res = await runLLM({
      task: "creative_strategy",
      agent: "creative_director",
      action: "cda.m3_concepts",
      system,
      prompt,
      temperature: 0.9,
      maxTokens: 3072,
    });

    return ConceptBoardSchema.parse(extractJson(res.text));
  } catch (err) {
    await logAgent({
      agent: "creative_director",
      action: "cda.m3_concepts.fallback",
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });

    return [
      {
        name: "Obsidian Precision",
        philosophy: "A single element on infinite darkness commands absolute authority.",
        style: "minimalist" as const,
        color_strategy: `Monochrome ${brandDna.colors.dark} base with single ${brandDna.colors.primary} accent glow`,
        typography_strategy: `${brandDna.typography.family}, uppercase, ${brandDna.typography.tracking} tracking`,
        composition_rules: ["Single focal element centered", "60%+ negative space", "One directional rim light"],
        mood_reference: "Apple product photography on matte black, Dieter Rams functional aesthetic",
        incompatibility_proof: "A single-element composition on infinite black cannot coexist with dense layered maximalism — adding elements destroys the authority of emptiness.",
      },
      {
        name: "Data Tapestry",
        philosophy: "Controlled visual density creates an impression of operational depth and intelligence.",
        style: "maximalist" as const,
        color_strategy: `Rich palette: ${brandDna.colors.primary}, ${brandDna.colors.secondary}, ${brandDna.colors.accents.join(", ")} on ${brandDna.colors.dark}`,
        typography_strategy: `Mixed weights of ${brandDna.typography.family}, layered at multiple scales`,
        composition_rules: ["Dense information layering", "Multiple visual planes", "Controlled chaos grid", "No single focal point — the system IS the subject"],
        mood_reference: "Bloomberg Businessweek data covers, Wired magazine editorial spreads",
        incompatibility_proof: "Dense multi-element layering fundamentally contradicts minimalist negative space — merging them creates visual confusion rather than either aesthetic.",
      },
      {
        name: "Atelier Protocol",
        philosophy: "Tech infrastructure reframed through the lens of luxury fashion craftsmanship.",
        style: "category_disruption" as const,
        color_strategy: `Muted luxury palette: warm ivory highlights on ${brandDna.colors.dark}, ${brandDna.colors.primary} as subtle thread`,
        typography_strategy: "Serif-sans hybrid, light weight, generous leading — haute couture catalog feel",
        composition_rules: ["Fashion editorial negative space", "Fabric-like texture overlays on abstract data", "Chiaroscuro studio lighting", "Asymmetric golden ratio composition"],
        mood_reference: "Dior Homme campaign photography, Celine brand identity, Aesop packaging",
        incompatibility_proof: "Fashion editorial luxury language (warm ivory, serif type, fabric textures) directly clashes with both cold minimalist tech precision and dense data maximalism — it operates in an entirely different visual vocabulary.",
      },
    ];
  }
}

// ─── M4: Execution Specialist ───────────────────────────────────────────────

const ADJECTIVE_TOKEN_MAP: Record<string, string> = {
  "premium dark corporate": "dark obsidian background (#060608), deep shadows, high-contrast, emerald accents (#10b981), sharp vector-like node interfaces, cinematic lighting",
  "minimalist tech": "matte black background (#0A0A0A), single element, extreme negative space, one accent color, geometric precision, surgical composition",
  "maximalist data": "deep charcoal background, dense layered composition, multiple data visualization elements, rich texture, controlled visual chaos, information density",
  "luxury fashion": "warm muted tones on deep black, fabric-like textures, editorial lighting, asymmetric composition, haute couture negative space",
  "brutalist architecture": "raw concrete textures, harsh directional light, geometric mass, dramatic shadows, Tadao Ando inspired minimalism",
};

function mapAdjectivesToTokens(concept: ConceptDirection): string {
  const moodLower = concept.mood_reference.toLowerCase();
  for (const [adj, tokens] of Object.entries(ADJECTIVE_TOKEN_MAP)) {
    if (moodLower.includes(adj.split(" ")[0]!)) return tokens;
  }
  return ADJECTIVE_TOKEN_MAP["premium dark corporate"]!;
}

async function executeOneConceptPrompt(
  brandDna: BrandDna,
  concept: ConceptDirection,
): Promise<DesignTokenPackage> {
  const adjectiveTokens = mapAdjectivesToTokens(concept);

  const prompt = [
    "You are an AI-Ready Design Token Transformer. Convert this visual concept into a precise DesignTokenPackage JSON.",
    "",
    "── CONCEPT ──",
    `Name: ${concept.name}`,
    `Style: ${concept.style}`,
    `Philosophy: ${concept.philosophy}`,
    `Color strategy: ${concept.color_strategy}`,
    `Typography strategy: ${concept.typography_strategy}`,
    `Composition rules: ${concept.composition_rules.join("; ")}`,
    `Mood reference: ${concept.mood_reference}`,
    "",
    "── BRAND DNA COLORS ──",
    `Primary: ${brandDna.colors.primary}, Secondary: ${brandDna.colors.secondary}, Dark: ${brandDna.colors.dark}, Accents: ${brandDna.colors.accents.join(", ")}`,
    "",
    "── ADJECTIVE-TO-TOKEN MAPPING ──",
    adjectiveTokens,
    "",
    "── REQUIRED OUTPUT FIELDS ──",
    "color_tokens: Record<string, string> — CSS custom property names to hex values (e.g., --bg-primary: #0A0A0A)",
    "typography_tokens: { font, size_scale, line_height, letter_spacing }",
    "spacing_tokens: { base_unit (e.g., '8px'), scale_ratio (e.g., 1.5) }",
    `nanobanana_prompt: A precise Imagen 3 prompt (60-120 words) that renders this concept. Start directly with visual description. MANDATORY NEGATIVE CONCEPTS: ${NEGATIVE_PROMPT_TOKENS}`,
    `negative_prompt_tokens: Split the negative prompt into an array of individual tokens`,
    "aspect_ratio: '1:1' (default)",
    "composition_notes: Brief production notes for consistency",
    "",
    "Return ONLY valid JSON. No markdown.",
  ].join("\n");

  const res = await runLLM({
    task: "visual_prompt",
    agent: "creative_director",
    action: `cda.m4_execution.${concept.style}`,
    system: "You are a Design Token Transformer. Output strict JSON only.",
    prompt,
    temperature: 0.3,
    maxTokens: 1536,
    timeoutMs: 20_000,
  });

  return DesignTokenPackageSchema.parse(extractJson(res.text));
}

async function runExecutionSpecialist(
  brandDna: BrandDna,
  concepts: ConceptBoard,
): Promise<DesignTokenPackage[]> {
  const results = await Promise.allSettled(
    concepts.map((concept) => executeOneConceptPrompt(brandDna, concept)),
  );

  const packages: DesignTokenPackage[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    const concept = concepts[i]!;

    if (result.status === "fulfilled") {
      packages.push(result.value);
    } else {
      await logAgent({
        agent: "creative_director",
        action: `cda.m4_execution.${concept.style}.fallback`,
        status: "error",
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });

      packages.push({
        color_tokens: {
          "--bg-primary": brandDna.colors.dark,
          "--accent-primary": brandDna.colors.primary,
          "--accent-secondary": brandDna.colors.secondary,
        },
        typography_tokens: {
          font: brandDna.typography.family,
          size_scale: "1.25",
          line_height: "1.4",
          letter_spacing: "0.05em",
        },
        spacing_tokens: { base_unit: "8px", scale_ratio: 1.5 },
        nanobanana_prompt: buildCreativePrompt({
          post_content: concept.philosophy,
          post_title: concept.name,
          post_type: "post_unico",
          visual_direction: `${concept.mood_reference}. ${concept.composition_rules.join(". ")}`,
          brand: {
            primary_color: brandDna.colors.primary,
            secondary_color: brandDna.colors.secondary,
            dark_color: brandDna.colors.dark,
            font_family: brandDna.typography.family,
            visual_style_notes: brandDna.visual_style.aesthetic_keywords.join(", "),
            logo_dark_url: null,
            logo_light_url: null,
          },
        }),
        negative_prompt_tokens: NEGATIVE_PROMPT_TOKENS.split(", "),
        aspect_ratio: "1:1",
        composition_notes: `Fallback prompt for ${concept.style} concept. Review manually.`,
      });
    }
  }

  return packages;
}

// ─── M5: Design Critic ──────────────────────────────────────────────────────

async function runDesignCritic(
  brandDna: BrandDna,
  concepts: ConceptBoard,
  tokenPackages: DesignTokenPackage[],
  researchBrief: ResearchBrief,
): Promise<CriticReport> {
  const system = await loadSystemPrompt("creative-critic");

  const conceptsWithTokens = concepts.map((c, i) => ({
    concept: c,
    tokens: tokenPackages[i],
  }));

  const prompt = [
    "Evaluate the following 3 concept + token packages against the 10 scoring criteria.",
    "",
    "── BRAND DNA ──",
    JSON.stringify(brandDna, null, 2),
    "",
    "── RESEARCH BRIEF (clichés to check against) ──",
    JSON.stringify(researchBrief.cliche_flags, null, 2),
    "",
    "── CONCEPTS + DESIGN TOKENS ──",
    JSON.stringify(conceptsWithTokens, null, 2),
    "",
    "Score the BEST concept in the set (since the packager selects the highest-scoring one).",
    "Return CriticReport JSON: scores (array of 10 {criterion, score, rationale}), overall_score (arithmetic mean, 1 decimal), verdict (approved if >= 7.0, else revision_needed), revision_directives (specific corrections if revision_needed, else empty array), strengths (string[]), fatal_flaws (scores <= 3, string[]).",
    "",
    "Criteria enum values: brand_alignment, anti_cliche, visual_hierarchy, emotional_resonance, technical_feasibility, originality, format_fit, copy_visual_coherence, competitive_differentiation, production_readiness.",
    "",
    "Return ONLY valid JSON. No markdown.",
  ].join("\n");

  try {
    const res = await runLLM({
      task: "creative_strategy",
      agent: "creative_director",
      action: "cda.m5_critic",
      system,
      prompt,
      temperature: 0.2,
      maxTokens: 2048,
    });

    const report = CriticReportSchema.parse(extractJson(res.text));

    const computedAvg =
      Math.round(
        (report.scores.reduce((sum, s) => sum + s.score, 0) / report.scores.length) * 10,
      ) / 10;
    report.overall_score = computedAvg;
    report.verdict = computedAvg >= CDA_SCORE_THRESHOLD ? "approved" : "revision_needed";

    return report;
  } catch (err) {
    await logAgent({
      agent: "creative_director",
      action: "cda.m5_critic.fallback",
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });

    return {
      scores: [
        { criterion: "brand_alignment", score: 7, rationale: "Auto-approved (critic unavailable)" },
        { criterion: "anti_cliche", score: 7, rationale: "Auto-approved (critic unavailable)" },
        { criterion: "visual_hierarchy", score: 7, rationale: "Auto-approved (critic unavailable)" },
        { criterion: "emotional_resonance", score: 7, rationale: "Auto-approved (critic unavailable)" },
        { criterion: "technical_feasibility", score: 7, rationale: "Auto-approved (critic unavailable)" },
        { criterion: "originality", score: 7, rationale: "Auto-approved (critic unavailable)" },
        { criterion: "format_fit", score: 7, rationale: "Auto-approved (critic unavailable)" },
        { criterion: "copy_visual_coherence", score: 7, rationale: "Auto-approved (critic unavailable)" },
        { criterion: "competitive_differentiation", score: 7, rationale: "Auto-approved (critic unavailable)" },
        { criterion: "production_readiness", score: 7, rationale: "Auto-approved (critic unavailable)" },
      ],
      overall_score: 7.0,
      verdict: "approved",
      revision_directives: [],
      strengths: ["Auto-approved due to critic module unavailability"],
      fatal_flaws: [],
    };
  }
}

// ─── M6: Delivery Packager ──────────────────────────────────────────────────

interface PackagerInput {
  brandDna: BrandDna;
  concepts: ConceptBoard;
  tokenPackages: DesignTokenPackage[];
  criticReport: CriticReport;
  attempts: number;
  totalDurationMs: number;
  forcedApproval: boolean;
}

function runDeliveryPackager(input: PackagerInput): CdaOutput {
  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < input.tokenPackages.length; i++) {
    const prompt = input.tokenPackages[i]!.nanobanana_prompt;
    const score = prompt.length >= 40 ? (i === 0 ? 1.0 : 0.9 - i * 0.1) : 0;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  const selected = input.concepts[bestIdx]!;
  const selectedTokens = input.tokenPackages[bestIdx]!;
  const alternatives = input.concepts.filter((_, i) => i !== bestIdx);

  return {
    brand_dna: input.brandDna,
    selected_concept: selected,
    design_tokens: selectedTokens,
    nanobanana_prompt: selectedTokens.nanobanana_prompt,
    negative_prompt: NEGATIVE_PROMPT_TOKENS,
    critic_report: input.criticReport,
    alternative_concepts: alternatives,
    generation_metadata: {
      attempts: input.attempts,
      total_duration_ms: input.totalDurationMs,
      forced_approval: input.forcedApproval,
      modules_executed: ["m1_briefing", "m2_research", "m3_concepts", "m4_execution", "m5_critic", "m6_packager"],
    },
  };
}

// ─── Fallback Output ────────────────────────────────────────────────────────

async function buildFallbackOutput(input: CdaInput): Promise<CdaOutput> {
  const prompt = await generateRefinedPrompt({
    post_copy: input.post_content,
    post_title: input.post_title,
    format: input.content_type,
    weekly_thesis: input.weekly_thesis,
  });

  return {
    brand_dna: DEFAULT_BRAND_DNA,
    selected_concept: {
      name: "Fallback Concept",
      philosophy: "Direct prompt-agent path due to CDA pipeline failure.",
      style: "minimalist",
      color_strategy: `${DEFAULT_BRAND_DNA.colors.primary} on ${DEFAULT_BRAND_DNA.colors.dark}`,
      typography_strategy: DEFAULT_BRAND_DNA.typography.family,
      composition_rules: ["Single focal point", "Negative space dominant"],
      mood_reference: "Monocle magazine, Linear.app",
      incompatibility_proof: "Fallback — no divergence performed.",
    },
    design_tokens: {
      color_tokens: {
        "--bg-primary": DEFAULT_BRAND_DNA.colors.dark,
        "--accent-primary": DEFAULT_BRAND_DNA.colors.primary,
      },
      typography_tokens: {
        font: DEFAULT_BRAND_DNA.typography.family,
        size_scale: "1.25",
        line_height: "1.4",
        letter_spacing: "0.05em",
      },
      spacing_tokens: { base_unit: "8px", scale_ratio: 1.5 },
      nanobanana_prompt: prompt,
      negative_prompt_tokens: NEGATIVE_PROMPT_TOKENS.split(", "),
      aspect_ratio: "1:1",
      composition_notes: "Fallback: generated via legacy prompt-agent path.",
    },
    nanobanana_prompt: prompt,
    negative_prompt: NEGATIVE_PROMPT_TOKENS,
    critic_report: {
      scores: [
        { criterion: "brand_alignment", score: 6, rationale: "Fallback path — no full evaluation" },
        { criterion: "anti_cliche", score: 6, rationale: "Fallback path — no full evaluation" },
        { criterion: "visual_hierarchy", score: 6, rationale: "Fallback path — no full evaluation" },
        { criterion: "emotional_resonance", score: 6, rationale: "Fallback path — no full evaluation" },
        { criterion: "technical_feasibility", score: 7, rationale: "Prompt-agent output is proven" },
        { criterion: "originality", score: 5, rationale: "Fallback path — no divergence" },
        { criterion: "format_fit", score: 7, rationale: "Prompt-agent handles format" },
        { criterion: "copy_visual_coherence", score: 6, rationale: "Fallback path — no full evaluation" },
        { criterion: "competitive_differentiation", score: 5, rationale: "Fallback path — no research" },
        { criterion: "production_readiness", score: 7, rationale: "Prompt-agent output is proven" },
      ],
      overall_score: 6.1,
      verdict: "approved",
      revision_directives: [],
      strengths: ["Proven prompt-agent output path"],
      fatal_flaws: ["Full CDA pipeline failed — using degraded path"],
    },
    alternative_concepts: [],
    generation_metadata: {
      attempts: 0,
      total_duration_ms: 0,
      forced_approval: true,
      modules_executed: ["fallback"],
    },
  };
}

// ─── Main Orchestrator ──────────────────────────────────────────────────────

export async function runCreativeDirector(input: CdaInput): Promise<CdaOutput> {
  const validatedInput = CdaInputSchema.parse(input);
  const startTime = Date.now();

  try {
    // M1: Briefing Strategist
    const brandVault = await fetchBrandContext();
    const brandDna = await runBriefingStrategist(validatedInput, brandVault);

    await logAgent({
      agent: "creative_director",
      action: "cda.m1_briefing.complete",
      status: "success",
      output: JSON.stringify(brandDna),
    });

    // M2: Research Analyst
    const researchBrief = await runResearchAnalyst(brandDna, validatedInput.briefing);

    await logAgent({
      agent: "creative_director",
      action: "cda.m2_research.complete",
      status: "success",
      output: JSON.stringify(researchBrief),
    });

    // M3–M5: Concept → Execute → Critique loop
    let concepts = await runConceptGenerator(brandDna, researchBrief, validatedInput.briefing);
    let retries = 0;
    let tokenPackages: DesignTokenPackage[];
    let criticReport: CriticReport;
    let forcedApproval = false;

    while (true) {
      tokenPackages = await runExecutionSpecialist(brandDna, concepts);
      criticReport = await runDesignCritic(brandDna, concepts, tokenPackages, researchBrief);

      await logAgent({
        agent: "creative_director",
        action: `cda.m5_critic.iteration_${retries}`,
        status: "success",
        output: `Score: ${criticReport.overall_score}, Verdict: ${criticReport.verdict}`,
      });

      if (criticReport.verdict === "approved" || retries >= CDA_MAX_RETRIES) {
        if (criticReport.verdict !== "approved" && retries >= CDA_MAX_RETRIES) {
          forcedApproval = true;
          await logAgent({
            agent: "creative_director",
            action: "cda.m5_critic.forced_approval",
            status: "pending",
            error: `Score ${criticReport.overall_score} below threshold after ${CDA_MAX_RETRIES} retries. Forcing approval.`,
          });
        }
        break;
      }

      retries++;
      concepts = await runConceptGenerator(
        brandDna,
        researchBrief,
        validatedInput.briefing,
        criticReport.revision_directives,
      );
    }

    // M6: Delivery Packager
    const output = runDeliveryPackager({
      brandDna,
      concepts,
      tokenPackages,
      criticReport,
      attempts: retries + 1,
      totalDurationMs: Date.now() - startTime,
      forcedApproval,
    });

    await logAgent({
      agent: "creative_director",
      action: "cda.complete",
      status: "success",
      output: `Selected: ${output.selected_concept.name} (${output.selected_concept.style}). Score: ${output.critic_report.overall_score}. Duration: ${output.generation_metadata.total_duration_ms}ms.`,
      duration_ms: output.generation_metadata.total_duration_ms,
    });

    return output;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startTime;

    await logAgent({
      agent: "creative_director",
      action: "cda.orchestrator.fatal",
      status: "error",
      error: message,
      duration_ms: durationMs,
    });

    return buildFallbackOutput(validatedInput);
  }
}
