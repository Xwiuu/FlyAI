import { env } from "./env.js";
import { serviceClient } from "./supabase.js";
import { logAgent } from "./logger.js";

export interface BrandContext {
  primary_color: string | null;
  secondary_color: string | null;
  dark_color: string | null;
  font_family: string | null;
  visual_style_notes: string | null;
  logo_dark_url: string | null;
  logo_light_url: string | null;
}

export interface ImageGenInput {
  post_content: string;
  post_title: string;
  post_type: string;
  visual_direction: string;
  weekly_thesis?: string | null;
  brand: BrandContext | null;
  aspect_ratio?: "1:1" | "9:16" | "4:5";
}

export async function fetchBrandContext(): Promise<BrandContext | null> {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("brand_vault")
    .select(
      "primary_color, secondary_color, dark_color, font_family, visual_style_notes, logo_dark_url, logo_light_url",
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as BrandContext | null;
}

export function buildCreativePrompt(input: ImageGenInput): string {
  const brand = input.brand;

  const brandLines = brand
    ? [
        "── IDENTIDADE VISUAL DA MARCA ──",
        brand.primary_color && `Cor primária: ${brand.primary_color}`,
        brand.secondary_color && `Cor secundária: ${brand.secondary_color}`,
        brand.dark_color && `Cor dark/fundo: ${brand.dark_color}`,
        brand.font_family && `Tipografia: ${brand.font_family}`,
        brand.visual_style_notes && `Notas de estilo: ${brand.visual_style_notes}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "Paleta padrão: amber #F5C518 sobre matte black #0A0A0A. Estética dark premium cinematográfica.";

  return [
    "You are an elite art director for a premium AI company. Create a single stunning image as the visual companion to the social media post below.",
    "",
    "── REGRAS INEGOCIÁVEIS ──",
    "1. LEIA a copy completa. A imagem DEVE ser uma METÁFORA VISUAL do conceito central, não uma ilustração literal.",
    "2. NUNCA gere: servidores genéricos, ondas roxas abstratas, robôs humanóides, cérebros digitais genéricos, globos com conexões, placas de circuito.",
    "3. Estética: cinematográfico, dark premium, editorial. Pense em capa da Monocle ou Bloomberg Businessweek.",
    "4. Composição: clean, respirada, um único ponto focal forte. Negative space é poder.",
    "5. Iluminação: studio lighting dramática, chiaroscuro, rim light sutil.",
    "6. Tipografia integrada: se incluir texto, use fonte sem-serifa geométrica, peso bold, tracking largo.",
    "",
    brandLines,
    "",
    `── POST COMPLETO (tipo: ${input.post_type}) ──`,
    `Título: ${input.post_title}`,
    "",
    input.post_content,
    "",
    `── DIREÇÃO DE ARTE DO CONTENT AGENT ──`,
    input.visual_direction,
    "",
    input.weekly_thesis
      ? `── TESE MACRO DA SEMANA ──\n${input.weekly_thesis}\n`
      : "",
    "── INSTRUÇÃO FINAL ──",
    "Pense profundamente sobre o conceito central desta copy. Qual é a METÁFORA mais poderosa para comunicar visualmente essa ideia?",
    "Crie uma imagem cinematográfica que capture essa metáfora. A imagem deve funcionar sozinha como uma peça de arte editorial premium.",
    `Aspect ratio: ${input.aspect_ratio ?? "1:1"}.`,
    "Render: ultra-sharp, 8K quality, professional color grading.",
  ]
    .filter(Boolean)
    .join("\n");
}

const IMAGEN_MODEL = "imagen-3.0-generate-002";
const IMAGEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict`;

export interface ImageGenResult {
  image_url: string | null;
  prompt_used: string;
  fallback: boolean;
}

export async function generateImage(
  input: ImageGenInput,
): Promise<ImageGenResult> {
  const prompt = buildCreativePrompt(input);

  try {
    const aspectMap: Record<string, string> = {
      "9:16": "9:16",
      "4:5": "3:4",
      "1:1": "1:1",
    };

    const res = await fetch(`${IMAGEN_ENDPOINT}?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: aspectMap[input.aspect_ratio ?? "1:1"] ?? "1:1",
          personGeneration: "dont_allow",
          safetyFilterLevel: "block_few",
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`imagen http ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as {
      predictions?: Array<{ bytesBase64Encoded?: string }>;
    };
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;

    if (!b64) throw new Error("imagen: no image in response");

    const supabase = serviceClient();
    const filename = `generated/${Date.now()}-${input.post_type}.png`;
    const buffer = Buffer.from(b64, "base64");

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(filename, buffer, { contentType: "image/png", upsert: true });

    if (uploadError)
      throw new Error(`storage upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage
      .from("post-images")
      .getPublicUrl(filename);

    await logAgent({
      agent: "content",
      action: "nanobanana.generate",
      status: "success",
      output: `Generated image: ${urlData.publicUrl}`,
    });

    return { image_url: urlData.publicUrl, prompt_used: prompt, fallback: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logAgent({
      agent: "content",
      action: "nanobanana.generate",
      status: "error",
      error: message,
    });

    return { image_url: null, prompt_used: prompt, fallback: true };
  }
}
