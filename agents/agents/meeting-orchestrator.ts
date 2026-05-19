import { runLLM, type TaskType } from "../lib/llm-router.js";
import { loadSystemPrompt, type SystemPromptName } from "../lib/prompts.js";
import { logAgent, type AgentName } from "../lib/logger.js";
import {
  appendMessage,
  createMeeting,
  getMeeting,
  listMessages,
  renderTranscript,
  setMeetingStatus,
  type MeetingMessageRow,
  type MeetingSender,
  type MeetingType,
} from "../lib/meetings.js";
import { materializeMeetingPosts } from "../lib/meeting-materializer.js";

interface ValidationResult {
  ok: boolean;
  missing: string[];
}

interface Step {
  sender: Exclude<MeetingSender, "user">;
  instruction: string;
  /** If true, after this turn the meeting waits for a user reply. */
  awaitsUserAfter?: boolean;
  /**
   * Optional gate: if the LLM reply does not pass this check, the step
   * re-runs (in-memory, nothing written to DB) with an enhanced instruction
   * that includes the incomplete reply and a precise list of what is missing.
   * Guards against the agent delivering a stub and the flow advancing anyway.
   */
  validate?: (reply: string) => ValidationResult;
  /** Max in-memory retries when validate fails. Defaults to 1. */
  maxRetries?: number;
}

const FLOWS: Record<MeetingType, Step[]> = {
  weekly_planning: [
    {
      sender: "research_agent",
      instruction:
        "Apresente os 3 sinais mais quentes da semana sobre o tema da reunião (tópicos, evidência curta com fonte, por que importa agora). Seja específico — números, nomes, datas.",
    },
    {
      sender: "ceo_agent",
      instruction:
        "Recebeu os sinais do Research. Proponha o **roadmap da semana**: tese central (1 frase), o **Pilar** (carrossel — ângulo + por quê), e os **3 Satélites** (formato: stories/post_unico + ângulo de cada um, ligados à tese). Peça aprovação explícita do founder antes de produção.",
      awaitsUserAfter: true,
    },
    {
      sender: "content_agent",
      instruction:
        "Aprovação recebida. Entregue o **[POST PILAR — CARROSSEL]** com a estrutura EXATA abaixo.\n\n" +
        "```\n" +
        "[POST PILAR — CARROSSEL]\n" +
        "Título: <título interno, não publicado>\n\n" +
        "Hooks:\n" +
        "  • medo_perda:     <hook pronto para publicar — começa com fricção ou perda de margem>\n" +
        "  • dados_frios:    <hook pronto para publicar — número específico, verificável>\n" +
        "  • ironia_mercado: <hook pronto para publicar — ironia técnica sobre estado do setor>\n\n" +
        "Visual: <prompt cinematográfico 80–140 palavras: lente, proporção 1:1, paleta escura, referência estilo>\n\n" +
        "Slides (mínimo 5, máximo 8):\n" +
        "  Slide 1: <título curto> | <bullet 1> | <bullet 2> | <bullet 3>\n" +
        "  Slide 2: ...\n" +
        "  ...\n" +
        "  Slide N: <síntese> | <bullet> | <CTA embutido>\n\n" +
        "CTA: <1–2 linhas, específico, sem urgência artificial>\n" +
        "Hashtags: #tag1 #tag2\n" +
        "```\n\n" +
        "Regra de qualidade: cada slide começa com dado ou fricção concreta — NUNCA com 'X é uma tecnologia que...'. " +
        "Use jargão técnico de engenharia (inferência, pipeline, overhead de coordenação, threshold de latência). " +
        "O leitor é um CTO que já sabe o que é automação. Escreva para um par técnico, não para uma landing page.",
      validate: (reply) => {
        const lower = reply.toLowerCase();
        const missing: string[] = [];
        const slideMatches = reply.match(/slide\s+\d+/gi) ?? [];
        if (slideMatches.length < 4) {
          missing.push(`Body do carrossel (encontrei ${slideMatches.length} slide(s) — mínimo 5 obrigatório)`);
        }
        if (!lower.includes("medo_perda") && !lower.includes("medo_") && !lower.includes("perda_")) {
          missing.push("Hook variante medo_perda");
        }
        if (!lower.includes("dados_frios") && !lower.includes("dados_")) {
          missing.push("Hook variante dados_frios");
        }
        if (!lower.includes("ironia_mercado") && !lower.includes("ironia_")) {
          missing.push("Hook variante ironia_mercado");
        }
        if (!lower.includes("visual:") && !lower.includes("visual_direction")) {
          missing.push("visual_direction (parágrafo cinematográfico)");
        }
        return { ok: missing.length === 0, missing };
      },
      maxRetries: 1,
    },
    {
      sender: "content_agent",
      instruction:
        "Agora entregue os **3 SATÉLITES COMPLETOS** na ordem proposta pelo CEO, usando a estrutura EXATA para cada um:\n\n" +
        "```\n" +
        "[POST SATÉLITE 1 — <FORMATO: STORIES | POST_UNICO>]\n" +
        "Título: <título interno>\n\n" +
        "Hooks:\n" +
        "  • medo_perda:     <hook publicável>\n" +
        "  • dados_frios:    <hook publicável>\n" +
        "  • ironia_mercado: <hook publicável>\n\n" +
        "Visual: <prompt cinematográfico próprio, proporção 9:16 para stories ou 1:1 para post_unico>\n\n" +
        "Body:\n" +
        "  (se STORIES) Frame 1: <texto ≤80 chars publicável> | Frame 2: ... | Frame 3–5: ...\n" +
        "  (se POST_UNICO) <legenda de 200–500 chars, prova + argumento, CTA no final>\n\n" +
        "CTA: <específico, sem urgência fabricada>\n" +
        "```\n\n" +
        "[POST SATÉLITE 2 — ...] (mesma estrutura)\n\n" +
        "[POST SATÉLITE 3 — ...] (mesma estrutura)\n\n" +
        "Regra de ouro: nenhum satélite pode ser stub ou placeholder. " +
        "Use jargão técnico real (inferência, SLA, token budget, orquestração). " +
        "Se faltar contexto do CEO sobre um satélite, pergunte — não invente.",
      validate: (reply) => {
        const lower = reply.toLowerCase();
        const missing: string[] = [];
        const satMarkers = [
          lower.includes("satélite 1") || lower.includes("satellite 1") || lower.includes("sat 1"),
          lower.includes("satélite 2") || lower.includes("satellite 2") || lower.includes("sat 2"),
          lower.includes("satélite 3") || lower.includes("satellite 3") || lower.includes("sat 3"),
        ];
        satMarkers.forEach((found, idx) => {
          if (!found) missing.push(`Satélite ${idx + 1} ausente ou sem marcador de cabeçalho`);
        });
        if (reply.trim().length < 600) {
          missing.push("Output muito curto para 3 satélites completos (mínimo 600 chars esperado)");
        }
        return { ok: missing.length === 0, missing };
      },
      maxRetries: 1,
    },
    {
      sender: "devils_advocate",
      instruction:
        "Você recebe agora o **pacote completo** (Carrossel Pilar + 3 Satélites) produzido pelo Content Agent. " +
        "Aplique sua doutrina: produza **4 a 8 críticas frias e específicas**, citando o nome da peça e o campo afetado (ex: 'Pilar — hook 2 alega R$X sem fonte plausível', 'Satélite 1 — body do stories repete o hook em outras palavras'). " +
        "Inclua pelo menos 1 crítica que cubra a coerência entre o Pilar e os Satélites: eles realmente puxam para a mesma tese, ou cada um vai para um lado?",
      awaitsUserAfter: true,
    },
    {
      sender: "ceo_agent",
      instruction:
        "Com o pacote completo apresentado e as críticas do Advogado do Diabo + a resposta do founder, **feche a reunião**:\n" +
        "- Liste o que entra na fila de aprovação como está (Pilar / Satélite N).\n" +
        "- Liste o que precisa de refino antes (cite a crítica que motiva).\n" +
        "- Defina ordem de publicação na semana (segunda = pilar, terça/quinta/sexta = satélites, por padrão).\n" +
        "- Confirme onde o founder verá os outputs (módulo /agentes).",
    },
  ],

  crisis: [
    {
      sender: "analytics_agent",
      instruction:
        "Apresente os números que motivaram a reunião de crise: janela, métricas-chave e onde está o desvio. Sem rodeio.",
    },
    {
      sender: "ceo_agent",
      instruction:
        "Diagnostique a causa provável e proponha 2–3 contramedidas imediatas, ordenadas por custo/benefício. Peça decisão do founder.",
      awaitsUserAfter: true,
    },
    {
      sender: "ceo_agent",
      instruction:
        "Com a decisão do founder, defina o plano de ação e o checkpoint de validação.",
    },
  ],

  content_review: [
    {
      sender: "content_agent",
      instruction:
        "Resuma o rascunho em revisão: 3 hooks, body em 1 frase, CTA, direção visual.",
    },
    {
      sender: "devils_advocate",
      instruction:
        "Aplique sua doutrina: produza 3–6 críticas frias e específicas ao rascunho apresentado.",
      awaitsUserAfter: true,
    },
    {
      sender: "ceo_agent",
      instruction:
        "Com base na resposta do founder, decida: aprovar, refinar ponto-a-ponto, ou descartar.",
    },
  ],

  ad_hoc: [
    {
      sender: "ceo_agent",
      instruction:
        "Responda ao input do founder com clareza estratégica. Seja específico e proponha próximo passo concreto.",
      awaitsUserAfter: true,
    },
  ],
};

/** Sender → system prompt name + LLM task type + per-turn token ceiling.
 *  maxTokens is generous here because meeting turns are conversational prose
 *  (no JSON), and truncation produces visible mid-sentence cuts in the UI. */
const SENDER_CONFIG: Record<
  Exclude<MeetingSender, "user">,
  { prompt: SystemPromptName; task: TaskType; logAs: AgentName; maxTokens: number }
> = {
  research_agent:  { prompt: "research",        task: "research",  logAs: "research",        maxTokens: 6144 },
  content_agent:   { prompt: "content",         task: "copy_ptbr", logAs: "content",         maxTokens: 6144 },
  ceo_agent:       { prompt: "ceo",             task: "analytics", logAs: "ceo",             maxTokens: 4096 },
  analytics_agent: { prompt: "analytics",       task: "analytics", logAs: "analytics",       maxTokens: 4096 },
  devils_advocate: { prompt: "devils-advocate", task: "analytics", logAs: "devils_advocate", maxTokens: 3072 },
};

/** Per meeting.type, the CEO agent gets a role override so it does NOT fall
 *  back to its default Daily Brief template (which is dated and bias-prone). */
const CEO_ROLE_BY_TYPE: Record<MeetingType, string> = {
  weekly_planning:
    "Você é um membro do conselho revisando o plano semanal apresentado pelo Research. " +
    "Valide ou refute com modelos mentais, e direcione formato âncora + ângulos dos satélites. " +
    "NÃO produza um Daily Brief — isto é uma reunião de planejamento, não um artefato agendado.",
  crisis:
    "Você é o COO em uma war room de crise. Diagnóstico frio, contramedidas concretas em ordem de custo/benefício.",
  content_review:
    "Você é o editor-chefe revisando uma peça de copy à luz das críticas do Advogado do Diabo. Decida: aprovar, refinar ponto-a-ponto, ou descartar.",
  ad_hoc:
    "Você é o sparring estratégico do founder. Resposta direta, próximo passo concreto.",
};

/** Hard ceiling on raw text length per turn. If the previous assistant message
 *  ends without sentence terminator (or with ellipsis added by truncation),
 *  we surface that to the next agent so it asks for completion. */
const TRUNCATION_TAIL = /[.!?\]\)»"]['"”’]?\s*$/;

function looksTruncated(text: string): boolean {
  const trimmed = text.trimEnd();
  if (trimmed.length < 40) return false;
  return !TRUNCATION_TAIL.test(trimmed);
}

export interface StartMeetingInput {
  type: MeetingType;
  title: string;
  /** Optional opening message from the user (e.g. the briefing). */
  opening?: string;
}

export interface StartMeetingResult {
  meeting_id: string;
}

/**
 * Creates a meeting row, optionally seeds it with an opening user message,
 * and runs the first agent turn. Returns the new meeting id.
 */
export async function startMeeting(input: StartMeetingInput): Promise<StartMeetingResult> {
  const { id } = await createMeeting({ type: input.type, title: input.title });

  if (input.opening && input.opening.trim().length > 0) {
    await appendMessage({
      meeting_id: id,
      sender: "user",
      role: "user",
      content: input.opening.trim(),
    });
  }

  await runMeetingTurn({ meeting_id: id });
  return { meeting_id: id };
}

export interface SendUserMessageInput {
  meeting_id: string;
  content: string;
}

/**
 * Append a user message and immediately advance one agent turn.
 */
export async function sendUserMessage(input: SendUserMessageInput): Promise<void> {
  const trimmed = input.content.trim();
  if (trimmed.length === 0) throw new Error("meeting: empty user message");

  await appendMessage({
    meeting_id: input.meeting_id,
    sender: "user",
    role: "user",
    content: trimmed,
  });

  await setMeetingStatus(input.meeting_id, "active");
  await runMeetingTurn({ meeting_id: input.meeting_id });
}

export interface RunMeetingTurnInput {
  meeting_id: string;
}

export interface RunMeetingTurnResult {
  done: boolean;
  spoke?: MeetingSender;
  awaiting_user: boolean;
}

/** Safety cap on auto-advanced consecutive agent turns per invocation,
 *  to prevent runaway in case a flow is misconfigured. */
const MAX_AUTO_ADVANCE_STEPS = 8;

/** Friendly in-character fallback when the LLM fallback chain exhausts.
 *  The raw error is logged to console.error on the server, not into the
 *  meeting transcript. The message keeps the persona ("eu") so it reads as
 *  the agent speaking, not as a system banner. */
function buildFallbackMessage(sender: Exclude<MeetingSender, "user">): string {
  const labelByAgent: Record<typeof sender, string> = {
    research_agent: "Research Agent",
    content_agent: "Content Agent",
    ceo_agent: "CEO Agent",
    analytics_agent: "Analytics Agent",
    devils_advocate: "Advogado do Diabo",
  };
  const speaker = labelByAgent[sender];
  return [
    `_${speaker} aqui._`,
    "",
    "Instabilidade temporária na rede de Inteligência Operacional. Não consegui me conectar aos meus modelos de linguagem upstream.",
    "",
    "William, por favor, clique em **Avançar Turno** novamente em alguns segundos para re-tentar a operação.",
  ].join("\n");
}

/**
 * Advances the meeting through CONSECUTIVE agent turns until either:
 *   - a step flagged `awaitsUserAfter` runs (status → awaiting_user), OR
 *   - the flow is exhausted (status → completed), OR
 *   - MAX_AUTO_ADVANCE_STEPS is reached (safety stop, status → active).
 *
 * This is what makes the weekly_planning flow deliver the full roadmap
 * (research → ceo → user → content_pilar → content_satellites → devil →
 *  user → ceo_close) without the founder clicking "Avançar" four times.
 *
 * ad_hoc is a special case: each invocation produces exactly one CEO reply
 * and waits for the user — it never auto-advances.
 */
export async function runMeetingTurn(
  input: RunMeetingTurnInput,
): Promise<RunMeetingTurnResult> {
  const meeting = await getMeeting(input.meeting_id);
  if (!meeting) throw new Error(`meeting ${input.meeting_id} not found`);
  if (meeting.status === "completed" || meeting.status === "archived") {
    return { done: true, awaiting_user: false };
  }

  const flow = FLOWS[meeting.type];
  let lastSpoke: MeetingSender | undefined;

  // Tracks in-memory retry state per step index. Retries do NOT write to DB,
  // so assistantCount is unaffected and the step pointer stays in place.
  // The incomplete reply + missing list are embedded in the next instruction.
  interface RetryState { count: number; lastReply: string; missing: string[] }
  const stepRetryState = new Map<number, RetryState>();

  for (let i = 0; i < MAX_AUTO_ADVANCE_STEPS; i++) {
    const messages = await listMessages(input.meeting_id);
    // "agent_error" placeholders do NOT advance the step pointer.
    const assistantCount = messages.filter(
      (m) =>
        m.role === "assistant" &&
        (m.metadata as { kind?: string } | null)?.kind !== "agent_error",
    ).length;

    // ad_hoc loops on its single step — every invocation is a fresh CEO reply.
    const stepIndex = meeting.type === "ad_hoc" ? 0 : assistantCount;
    const step = flow[stepIndex];

    if (!step) {
      await materializeMeetingPosts(input.meeting_id, meeting.type);
      await setMeetingStatus(input.meeting_id, "completed");
      return { done: true, spoke: lastSpoke, awaiting_user: false };
    }

    // On a validation retry, prepend the prior incomplete output and the list
    // of what is missing so the agent can deliver a complete version.
    const retryState = stepRetryState.get(stepIndex);
    let effectiveInstruction = step.instruction;
    if (retryState && retryState.count > 0) {
      effectiveInstruction =
        `Sua resposta anterior estava **incompleta**. Isso foi entregue:\n\n` +
        `---\n${retryState.lastReply}\n---\n\n` +
        `Itens ainda faltando:\n${retryState.missing.map((m) => `- ${m}`).join("\n")}\n\n` +
        `**Entregue o output completo do zero, com TODOS os itens obrigatórios da instrução original.**\n\n` +
        step.instruction;
    }

    let reply: string;
    try {
      reply = await invokeAgent({
        sender: step.sender,
        instruction: effectiveInstruction,
        history: messages,
        meetingTitle: meeting.title,
        meetingType: meeting.type,
      });
    } catch (err) {
      // LLM fallback chain exhausted (commonly 429 quota or upstream timeout).
      // Surface a clean in-character message to the founder; keep the raw
      // error on the server-side console for debugging.
      console.error(
        `[meeting ${input.meeting_id}] ${step.sender} turn failed:`,
        err instanceof Error ? err.stack ?? err.message : err,
      );

      await appendMessage({
        meeting_id: input.meeting_id,
        sender: step.sender,
        role: "assistant",
        content: buildFallbackMessage(step.sender),
        metadata: {
          step_index: stepIndex,
          flow_type: meeting.type,
          kind: "agent_error",
          error: err instanceof Error ? err.message : String(err),
        },
      });

      // Leave status=active so the UI shows the "Avançar turno" button.
      // The assistantCount filter above ignores this placeholder, so the
      // retry replays the same step rather than skipping ahead.
      await setMeetingStatus(input.meeting_id, "active");
      return { done: false, spoke: step.sender, awaiting_user: false };
    }

    // Completeness gate: if the step defines a validator and the reply fails,
    // retry in-memory (without writing to DB) up to step.maxRetries times.
    // After that, accept whatever is there and continue.
    if (step.validate) {
      const { ok, missing } = step.validate(reply);
      if (!ok) {
        const prevRetries = stepRetryState.get(stepIndex)?.count ?? 0;
        if (prevRetries < (step.maxRetries ?? 1)) {
          stepRetryState.set(stepIndex, { count: prevRetries + 1, lastReply: reply, missing });
          // Do NOT write to DB — loop back to re-run the same step.
          continue;
        }
        // Max retries hit: accept partial output, log the gap.
        console.warn(
          `[meeting ${input.meeting_id}] ${step.sender} step ${stepIndex}: ` +
          `completeness gate failed after ${prevRetries + 1} attempt(s). Missing: ${missing.join("; ")}. Accepting partial output.`,
        );
      }
    }
    // Clear retry state for this step now that we're committing the reply.
    stepRetryState.delete(stepIndex);

    await appendMessage({
      meeting_id: input.meeting_id,
      sender: step.sender,
      role: "assistant",
      content: reply,
      metadata: { step_index: stepIndex, flow_type: meeting.type },
    });
    lastSpoke = step.sender;

    const isLastStep = stepIndex >= flow.length - 1 && meeting.type !== "ad_hoc";

    // Step wants the user — pause and surface.
    if (step.awaitsUserAfter) {
      await setMeetingStatus(input.meeting_id, "awaiting_user");
      return { done: false, spoke: lastSpoke, awaiting_user: true };
    }

    // End of flow — materialize any structured artifacts (e.g. weekly_planning
    // posts), then mark completed so the /agentes approval queue picks them up.
    if (isLastStep) {
      await materializeMeetingPosts(input.meeting_id, meeting.type);
      await setMeetingStatus(input.meeting_id, "completed");
      return { done: true, spoke: lastSpoke, awaiting_user: false };
    }

    // ad_hoc never chains — one turn per invocation, then wait for user.
    if (meeting.type === "ad_hoc") {
      await setMeetingStatus(input.meeting_id, "awaiting_user");
      return { done: false, spoke: lastSpoke, awaiting_user: true };
    }

    // Otherwise: keep going to the next agent turn in this invocation.
  }

  // Hit the safety cap without natural pause/end — leave active so the UI
  // shows "Avançar turno" and the founder can resume manually.
  await setMeetingStatus(input.meeting_id, "active");
  return { done: false, spoke: lastSpoke, awaiting_user: false };
}

interface InvokeAgentInput {
  sender: Exclude<MeetingSender, "user">;
  instruction: string;
  history: MeetingMessageRow[];
  meetingTitle: string;
  meetingType: MeetingType;
}

async function invokeAgent(input: InvokeAgentInput): Promise<string> {
  const { sender, instruction, history, meetingTitle, meetingType } = input;
  const config = SENDER_CONFIG[sender];
  const baseSystem = await loadSystemPrompt(config.prompt);

  // Runtime system override — appended AFTER the agent's static prompt so it
  // takes precedence over any baked-in templates (e.g. CEO's Daily Brief layout
  // dated 2023). LLMs weight late-system instructions more strongly.
  const today = new Date().toISOString().slice(0, 10);
  const overrideLines: string[] = [
    "",
    "---",
    "",
    "## RUNTIME OVERRIDE — esta execução é uma reunião interativa, não um artefato agendado",
    "",
    `- Data de hoje: **${today}**. NÃO mencione 2023, 2024 ou qualquer ano que não seja o atual.`,
    `- Você está em uma sala de reunião do dashboard, tipo: \`${meetingType}\`, intitulada "${meetingTitle}".`,
    "- IGNORE qualquer template de saída do seu system prompt acima (Daily Brief, Relatório Mensal, schema JSON estrito etc).",
    "- Responda em **markdown PT-BR conversacional**, como um membro do conselho falando em reunião viva.",
    "- Sem code fences, sem JSON, sem assinatura, sem cabeçalho `# Daily Brief —`.",
    "- Se uma mensagem anterior do histórico parecer truncada ou incompleta, **peça explicitamente ao agente para complementar** — nunca fabrique log de erro nem invente o que faltou.",
    "- Se faltar dado real, peça ao founder no chat — não preencha lacuna com invenção.",
  ];

  if (sender === "ceo_agent") {
    overrideLines.push("", `**Seu papel nesta reunião:** ${CEO_ROLE_BY_TYPE[meetingType]}`);
  }

  if (sender === "content_agent") {
    overrideLines.push(
      "",
      "**Tom obrigatório — Content Agent em produção de conteúdo:**",
      "- Escreva como engenheiro técnico sênior falando para outro engenheiro. O leitor é um CTO que já sabe o que é automação, LLM e agente de IA — não explique conceitos básicos.",
      "- BANIDO: frases de definição ou onboarding ('X é uma tecnologia que...', 'X permite que empresas...', 'A automação ajuda...', 'No mundo atual...').",
      "- OBRIGATÓRIO: jargão técnico real — inferência, pipeline de dados, overhead de coordenação, threshold de latência, token budget, context window, orquestração multi-agente, SLA de resposta, custo de compute.",
      "- Cada slide/frame começa com dado concreto, fricção real ou número verificável — NUNCA com afirmação conceitual.",
      "- Se o ângulo do CEO for vago, eleve a especificidade: troque 'custos reduzidos' por 'R$X de burn em headcount para tarefas que rodam em <200ms de inferência'.",
      "- Escreva blocos claramente marcados com os cabeçalhos exatos da instrução ([POST PILAR — CARROSSEL], [POST SATÉLITE N — FORMATO]).",
    );
  }

  const system = `${baseSystem}\n${overrideLines.join("\n")}`;

  const transcript = renderTranscript(history);

  // Detect a truncated prior assistant turn so the current agent surfaces it
  // explicitly rather than guessing at the missing content.
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  const truncationHint =
    lastAssistant && looksTruncated(lastAssistant.content)
      ? `\n\nAVISO: a última fala de \`${lastAssistant.sender}\` (#${lastAssistant.sequence}) aparenta ter sido cortada antes de terminar. Peça a ele para completar o ponto antes de avançar. NÃO assuma o que ele ia dizer.`
      : "";

  const prompt = [
    `Sala: "${meetingTitle}" (tipo: ${meetingType}).`,
    "Participantes humanos: os founders. Demais: agentes do time.",
    "",
    "Histórico até agora:",
    "",
    transcript,
    "",
    `Sua tarefa nesta rodada: ${instruction}${truncationHint}`,
    "",
    "Responda em markdown PT-BR conversacional, 3–8 parágrafos curtos ou bullets. Termine cada frase.",
  ].join("\n");

  const res = await runLLM({
    task: config.task,
    agent: config.logAs,
    action: `meeting.${sender}`,
    system,
    prompt,
    temperature: 0.4,
    maxTokens: config.maxTokens,
  });

  await logAgent({
    agent: "meeting",
    action: `meeting.turn.${sender}`,
    status: "success",
    tokens_used: res.tokens_used,
  });

  return res.text.trim();
}
