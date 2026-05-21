import { z } from "zod";

// ─── CDA Input ───────────────────────────────────────────────────────────────

export const CdaInputSchema = z.object({
  briefing: z.string().min(1),
  content_type: z.enum(["carousel", "stories", "post_unico"]),
  post_content: z.string().min(1),
  post_title: z.string().min(1),
  weekly_thesis: z.string().nullable(),
  force_concept_style: z
    .enum(["minimalist", "maximalist", "category_disruption"])
    .optional(),
});

export type CdaInput = z.infer<typeof CdaInputSchema>;

// ─── M1: Brand DNA ──────────────────────────────────────────────────────────

export const BrandDnaSchema = z.object({
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    dark: z.string(),
    accents: z.array(z.string()),
  }),
  typography: z.object({
    family: z.string(),
    weight_preference: z.string(),
    tracking: z.string(),
  }),
  visual_style: z.object({
    aesthetic_keywords: z.array(z.string()).min(1),
    forbidden_concepts: z.array(z.string()),
    reference_brands: z.array(z.string()),
  }),
  tone: z.object({
    formality: z.number().int().min(1).max(10),
    warmth: z.number().int().min(1).max(10),
    density: z.number().int().min(1).max(10),
  }),
});

export type BrandDna = z.infer<typeof BrandDnaSchema>;

// ─── M2: Research Brief ─────────────────────────────────────────────────────

export const ClicheFlagSchema = z.object({
  pattern: z.string(),
  why_cliche: z.string(),
});

export type ClicheFlag = z.infer<typeof ClicheFlagSchema>;

export const ResearchBriefSchema = z.object({
  category_benchmarks: z.array(z.string()),
  cliche_flags: z.array(ClicheFlagSchema),
  disruption_vectors: z.array(z.string()).length(3),
  competitor_visual_language: z.string(),
});

export type ResearchBrief = z.infer<typeof ResearchBriefSchema>;

// ─── M3: Concept Board ──────────────────────────────────────────────────────

export const ConceptStyleEnum = z.enum([
  "minimalist",
  "maximalist",
  "category_disruption",
]);

export type ConceptStyle = z.infer<typeof ConceptStyleEnum>;

export const ConceptDirectionSchema = z.object({
  name: z.string().min(1),
  philosophy: z.string().min(1),
  style: ConceptStyleEnum,
  color_strategy: z.string().min(1),
  typography_strategy: z.string().min(1),
  composition_rules: z.array(z.string()).min(1),
  mood_reference: z.string().min(1),
  incompatibility_proof: z.string().min(1),
});

export type ConceptDirection = z.infer<typeof ConceptDirectionSchema>;

export const ConceptBoardSchema = z.array(ConceptDirectionSchema).length(3);

export type ConceptBoard = z.infer<typeof ConceptBoardSchema>;

// ─── M4: Design Token Package ───────────────────────────────────────────────

export const DesignTokenPackageSchema = z.object({
  color_tokens: z.record(z.string(), z.string()),
  typography_tokens: z.object({
    font: z.string(),
    size_scale: z.string(),
    line_height: z.string(),
    letter_spacing: z.string(),
  }),
  spacing_tokens: z.object({
    base_unit: z.string(),
    scale_ratio: z.number(),
  }),
  nanobanana_prompt: z.string().min(40),
  negative_prompt_tokens: z.array(z.string()),
  aspect_ratio: z.enum(["1:1", "9:16", "4:5"]).default("1:1"),
  composition_notes: z.string(),
});

export type DesignTokenPackage = z.infer<typeof DesignTokenPackageSchema>;

// ─── M5: Critic Report ──────────────────────────────────────────────────────

export const CriticCriterionEnum = z.enum([
  "brand_alignment",
  "anti_cliche",
  "visual_hierarchy",
  "emotional_resonance",
  "technical_feasibility",
  "originality",
  "format_fit",
  "copy_visual_coherence",
  "competitive_differentiation",
  "production_readiness",
]);

export type CriticCriterion = z.infer<typeof CriticCriterionEnum>;

export const CriticScoreSchema = z.object({
  criterion: CriticCriterionEnum,
  score: z.number().min(1).max(10),
  rationale: z.string().min(1),
});

export type CriticScore = z.infer<typeof CriticScoreSchema>;

export const CriticVerdictEnum = z.enum(["approved", "revision_needed"]);

export const CriticReportSchema = z.object({
  scores: z.array(CriticScoreSchema).length(10),
  overall_score: z.number().min(1).max(10),
  verdict: CriticVerdictEnum,
  revision_directives: z.array(z.string()),
  strengths: z.array(z.string()),
  fatal_flaws: z.array(z.string()),
});

export type CriticReport = z.infer<typeof CriticReportSchema>;

// ─── M6: CDA Output ────────────────────────────────────────────────────────

export const CdaMetadataSchema = z.object({
  attempts: z.number().int().min(1),
  total_duration_ms: z.number().int(),
  forced_approval: z.boolean(),
  modules_executed: z.array(z.string()),
});

export type CdaMetadata = z.infer<typeof CdaMetadataSchema>;

export const CdaOutputSchema = z.object({
  brand_dna: BrandDnaSchema,
  selected_concept: ConceptDirectionSchema,
  design_tokens: DesignTokenPackageSchema,
  nanobanana_prompt: z.string().min(40),
  negative_prompt: z.string(),
  critic_report: CriticReportSchema,
  alternative_concepts: z.array(ConceptDirectionSchema),
  generation_metadata: CdaMetadataSchema,
});

export type CdaOutput = z.infer<typeof CdaOutputSchema>;

// ─── Scoring threshold ──────────────────────────────────────────────────────

export const CDA_SCORE_THRESHOLD = 7.0;
export const CDA_MAX_RETRIES = 2;

export const NEGATIVE_PROMPT_TOKENS =
  "humanoid robots, stock photography faces, literal 3D gear icons, " +
  "generic purple abstract waves, planets, server racks, circuit boards, " +
  "exposed digital brains, glowing neurons, globes with network lines, " +
  "handshake illustrations, lightbulb moments, rocket ships";
