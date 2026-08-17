/**
 * KAIOS request orchestrator — single conversational inference for normal turns.
 *
 * Streaming protocol (plan §4):
 * - needs_structure=false → DeepSeek stream → SSE delta* → done envelope
 * - needs_structure=true  → one DeepSeek complete (JSON) → optional synthetic
 *   deltas from message → done (+ card transport alias from same envelope)
 *
 * Never calls structured-chat second LLM.
 */

import { ModelRouter } from "@/lib/ai/model-router";
import { extractJsonObject } from "@/lib/ai/extract-json";
import {
  containsCanary,
  scrubModelOutput,
  visibleStreamDelta,
} from "@/lib/ai/prompt-safety";
import type { ChatTurn, TokenUsage } from "@/lib/ai/types";
import { buildRuntimeContext } from "@/lib/kaios/context/builder";
import { compilePrompt } from "@/lib/kaios/compiler/prompt";
import {
  needsStructuredOutput,
  resolveIntent,
  type CoachId,
  type Intent,
} from "@/lib/kaios/routing/intent";
import {
  SCHEMA_VERSION,
  parseBaseEnvelope,
  type BaseEnvelope,
} from "@/lib/kaios/schemas/envelope";
import {
  createTokenTelemetryRecord,
  withProviderUsage,
} from "@/lib/kaios/telemetry/tokens";
import {
  dispatchPostModelTools,
  maybeQueueMayaFoodLogConfirmation,
  prefetchToolKnowledge,
} from "@/lib/kaios/tools/dispatch";
import { maybeQueueCoachLogConfirmation } from "@/lib/kaios/analytics/chat-log";
import {
  actionTruthHintForPrompt,
  enforceActionTruthOnPayload,
  scrubFalseSuccessClaims,
  type ActionTruthRecord,
} from "@/lib/kaios/tools/action-truth";
import { logger } from "@/lib/logger";
import type { SseChunk } from "@/lib/api/sse";
import type { MessageType } from "@/lib/types/database.types";

export type OrchestrateChatInput = {
  userId: string;
  coachId: CoachId;
  message: string;
  locale: string;
  userState?: string;
  memoryItems?: string[];
  teamFacts?: string[];
  knowledge?: string[];
  conversationTurns?: ChatTurn[];
  hasImage?: boolean;
  signal?: AbortSignal;
};

export type OrchestrateResultMeta = {
  intent: Intent;
  envelope: BaseEnvelope;
  messageType: MessageType;
  payload: Record<string, unknown> | null;
  usageTokens: number;
  modelCallCount: number;
  telemetry: ReturnType<typeof createTokenTelemetryRecord>;
  awaitUser?: boolean;
  assistantText: string;
  aborted?: boolean;
  /** Provider finish_reason when streaming (e.g. length = truncated at max_tokens). */
  finishReason?: string | null;
  actionTruth?: ActionTruthRecord[];
  /** Pending Maya meal confirmation for chat.service UI wiring. */
  confirmation?: { pendingId: string; summary: string };
};

function messageTypeForIntent(
  intent: Intent,
  envelope: BaseEnvelope,
): MessageType {
  const uiType =
    envelope.ui && typeof envelope.ui === "object"
      ? (envelope.ui as { cardType?: string }).cardType
      : undefined;
  if (uiType === "workout_plan") return "workout_plan";
  if (uiType === "meal_plan") return "meal_plan";
  if (uiType === "daily_summary") return "daily_summary";
  if (uiType === "score" || intent === "physique_analysis") return "score";
  if (uiType === "analysis" || intent === "meal_analysis") return "analysis";
  if (intent === "programming") return "workout_plan";
  if (intent === "meal_plan") return "meal_plan";
  return "text";
}

function payloadFromEnvelope(envelope: BaseEnvelope): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    schema_version: envelope.schema_version,
    coach: envelope.coach,
    intent: envelope.intent,
  };
  if (envelope.data !== undefined) payload.data = envelope.data;
  if (envelope.actions !== undefined) payload.actions = envelope.actions;
  if (envelope.ui !== undefined) payload.ui = envelope.ui;
  if (envelope.meta !== undefined) payload.meta = envelope.meta;
  return payload;
}

function tryParseJsonObject(text: string): unknown | null {
  const extracted = extractJsonObject(text);
  return extracted.ok ? extracted.value : null;
}

function casualEnvelope(
  coach: CoachId,
  message: string,
  intent: Intent,
): BaseEnvelope {
  return {
    schema_version: SCHEMA_VERSION,
    coach,
    message,
    intent,
  };
}

function structuredSystemHint(intent: Intent): string {
  return [
    "Return ONLY valid JSON matching the Kaify envelope:",
    '{ "schema_version":"' +
      SCHEMA_VERSION +
      '", "coach":"<id>", "message":"<user-facing>", "intent":"' +
      intent +
      '", "data":{}, "ui":{}, "actions":[] }',
    "Omit unused fields. message is localized natural coach speech.",
    intent === "programming"
      ? "Sets/reps live in data/ui. message MUST coach every listed lift: how to do it, how not to (common mistakes), what to watch. Put a short cue in exercise.notes when present."
      : "Do not duplicate structured numbers already in data/ui inside message.",
    "No generic closing. Answer directly.",
    actionTruthHintForPrompt(),
    intent === "tool_action"
      ? 'For tool requests use actions:[{ "type":"<allowlistedTool>", "payload":{...} }]. Never invent tool success in message.'
      : intent === "programming"
        ? 'Program changes are PROPOSED only. data.status must be "proposed". Never claim applied. Use only exercise_ids present in DATA/library candidates.'
        : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Streams SSE deltas and writes completion metadata into `out.meta`.
 */
export async function* orchestrateCoachChat(
  input: OrchestrateChatInput,
  out: { meta?: OrchestrateResultMeta },
): AsyncGenerator<SseChunk> {
  const intent = resolveIntent({
    coach: input.coachId,
    message: input.message,
    hasImage: input.hasImage,
  });

  // Bounded read prefetch (0–1) before model — never writes.
  const prefetch = await prefetchToolKnowledge({
    userId: input.userId,
    coach: input.coachId,
    intent,
    message: input.message,
  });
  const knowledge = [
    ...(input.knowledge ?? []),
    ...prefetch.knowledgeLines,
  ];

  const ctx = buildRuntimeContext({
    coach: input.coachId,
    message: input.message,
    locale: input.locale,
    userState: input.userState,
    memoryItems: input.memoryItems,
    teamFacts: input.teamFacts,
    knowledge: knowledge.length ? knowledge : undefined,
    conversationTurns: input.conversationTurns,
    hasImage: input.hasImage,
  });

  const compiled = compilePrompt(ctx);
  // Inject action-truth reminder into system for casual path too.
  if (compiled.messages[0]?.role === "system") {
    compiled.messages[0] = {
      role: "system",
      content: `${compiled.messages[0].content}\n\n${actionTruthHintForPrompt()}`,
    };
  }
  const startedAt = Date.now();
  let telemetry = createTokenTelemetryRecord({
    coach: input.coachId,
    intent,
    tier: ctx.tier,
    breakdown: compiled.breakdown,
    maxOutputTokens: ctx.maxTokens,
  });

  const temperature = input.coachId === "kai" ? 0.85 : 0.7;
  let modelCallCount = 0;
  let usageTokens = 0;
  let providerUsage: TokenUsage | null = null;
  let assistantText = "";
  let streamFinishReason: string | null = null;
  let envelope: BaseEnvelope;
  let awaitUser = false;
  let actionTruth: ActionTruthRecord[] = [...prefetch.truths];
  let confirmation: { pendingId: string; summary: string } | undefined;

  if (!needsStructuredOutput(intent)) {
    modelCallCount = 1;
    if (input.signal?.aborted) {
      out.meta = {
        intent,
        envelope: casualEnvelope(input.coachId, "", intent),
        messageType: "text",
        payload: null,
        usageTokens: 0,
        modelCallCount,
        telemetry: withProviderUsage(telemetry, null, {
          modelCallCount,
          latencyMs: Date.now() - startedAt,
        }),
        assistantText: "",
        aborted: true,
      };
      return;
    }
    for await (const event of ModelRouter.streamText(compiled.messages, {
      temperature,
      maxTokens: ctx.maxTokens,
      signal: input.signal,
      usageContext: {
        userId: input.userId,
        operation: "kaios_chat_stream",
      },
    })) {
      if (input.signal?.aborted) {
        out.meta = {
          intent,
          envelope: casualEnvelope(input.coachId, "", intent),
          messageType: "text",
          payload: null,
          usageTokens: 0,
          modelCallCount,
          telemetry: withProviderUsage(telemetry, null, {
            modelCallCount,
            latencyMs: Date.now() - startedAt,
          }),
          assistantText: "",
          aborted: true,
        };
        return;
      }
      if (event.type === "delta") {
        const previous = assistantText;
        const next = assistantText + event.content;
        if (containsCanary(next, compiled.canary)) {
          logger.error("kaios: canary leak blocked", {
            userId: input.userId,
            coachId: input.coachId,
          });
          yield {
            event: "error",
            data: {
              code: "FORBIDDEN",
              message:
                "Güvenlik nedeniyle bu yanıt durduruldu. Lütfen sorunu farklı bir şekilde sor.",
            },
          };
          out.meta = {
            intent,
            envelope: casualEnvelope(input.coachId, "", intent),
            messageType: "text",
            payload: null,
            usageTokens: 0,
            modelCallCount,
            telemetry: withProviderUsage(telemetry, null, {
              modelCallCount,
              latencyMs: Date.now() - startedAt,
            }),
            assistantText: "",
          };
          return;
        }
        assistantText = next;
        const visible = visibleStreamDelta(previous, next);
        if (visible) {
          yield { event: "delta", data: { content: visible } };
        }
      } else if (event.type === "done") {
        providerUsage = event.usage;
        usageTokens = event.usage?.total_tokens ?? 0;
        if (event.finishReason) streamFinishReason = event.finishReason;
      }
    }
    assistantText = scrubModelOutput(assistantText, compiled.canary);
    envelope = casualEnvelope(input.coachId, assistantText, intent);
  } else {
    modelCallCount = 1;
    const messages: ChatTurn[] = [
      ...compiled.messages.slice(0, -1),
      {
        role: "system",
        content: structuredSystemHint(intent),
      },
      compiled.messages[compiled.messages.length - 1]!,
    ];

    const { content, usage } = await ModelRouter.completeText(messages, {
      temperature: Math.min(temperature, 0.5),
      maxTokens: ctx.maxTokens,
      signal: input.signal,
      usageContext: {
        userId: input.userId,
        operation: "kaios_chat_structured",
      },
    });
    providerUsage = usage;
    usageTokens = usage?.total_tokens ?? 0;
    const scrubbed = scrubModelOutput(content, compiled.canary);
    const parsed = tryParseJsonObject(scrubbed);
    const envelopeResult = parsed ? parseBaseEnvelope(parsed) : null;

    if (envelopeResult?.ok) {
      envelope = envelopeResult.data;
      assistantText = envelope.message;
    } else {
      // Schema failure recovery: never invent structured success — text-only.
      assistantText = scrubbed;
      envelope = casualEnvelope(input.coachId, assistantText, intent);
      logger.warn("kaios: structured parse failed; text fallback", {
        coachId: input.coachId,
        intent,
      });
    }

    if (assistantText.length > 0) {
      const chunkSize = 48;
      for (let i = 0; i < assistantText.length; i += chunkSize) {
        yield {
          event: "delta",
          data: { content: assistantText.slice(i, i + chunkSize) },
        };
      }
    }

    const data = envelope.data as { await_user?: boolean } | undefined;
    awaitUser = Boolean(data?.await_user);
  }

  // Bounded post-model tool/validate (max 1) — server-owned userId.
  const post = await dispatchPostModelTools({
    userId: input.userId,
    coach: input.coachId,
    intent,
    envelope,
  });
  actionTruth = [...actionTruth, ...post.truths];
  if (post.confirmation) confirmation = post.confirmation;

  if (!confirmation && assistantText.trim().length > 0) {
    const foodLog = await maybeQueueMayaFoodLogConfirmation({
      userId: input.userId,
      coach: input.coachId,
      userMessage: input.message,
      assistantText,
      alreadyConfirming: false,
    });
    actionTruth = [...actionTruth, ...foodLog.truths];
    if (foodLog.confirmation) confirmation = foodLog.confirmation;
  }

  if (!confirmation) {
    const coachLog = await maybeQueueCoachLogConfirmation({
      userId: input.userId,
      coach: input.coachId,
      userMessage: input.message,
      alreadyConfirming: false,
    });
    actionTruth = [...actionTruth, ...coachLog.truths];
    if (coachLog.confirmation) confirmation = coachLog.confirmation;
  }

  // Downgrade invalid Alex program cards.
  const idValidationFailed = post.truths.some(
    (t) =>
      t.tool === "validateExerciseIds" && t.status === "FAILED",
  );
  if (idValidationFailed) {
    envelope = {
      ...envelope,
      message:
        scrubFalseSuccessClaims(envelope.message, actionTruth) ||
        envelope.message,
      data: {
        ...(typeof envelope.data === "object" && envelope.data
          ? envelope.data
          : {}),
        status: "proposed",
        exercise_validation: "failed",
      },
      ui: undefined,
    };
    assistantText = envelope.message;
  }

  assistantText = scrubFalseSuccessClaims(assistantText, actionTruth);
  envelope = { ...envelope, message: assistantText };

  if (usageTokens <= 0) {
    const promptChars = compiled.messages.reduce(
      (n, m) => n + m.content.length,
      0,
    );
    usageTokens = Math.ceil((promptChars + assistantText.length) / 4);
  }

  telemetry = withProviderUsage(telemetry, providerUsage, {
    modelCallCount,
    visionCallCount: 0,
    latencyMs: Date.now() - startedAt,
  });

  let messageType = messageTypeForIntent(intent, envelope);
  if (idValidationFailed) messageType = "text";

  // Programming without apply backend is never an applied workout_plan claim.
  if (intent === "programming" && envelope.data) {
    const data =
      typeof envelope.data === "object" && envelope.data
        ? { ...(envelope.data as Record<string, unknown>) }
        : {};
    if (!data.status) data.status = "proposed";
    if (data.status === "applied") data.status = "proposed";
    envelope = { ...envelope, data };
  }

  let payload: Record<string, unknown> | null =
    messageType === "text" && !envelope.data && !envelope.ui && !confirmation
      ? {
          schema_version: envelope.schema_version,
          coach: envelope.coach,
          intent: envelope.intent,
        }
      : payloadFromEnvelope(envelope);

  if (
    payload &&
    messageType !== "text" &&
    envelope.data &&
    typeof envelope.data === "object" &&
    payload.ui === undefined
  ) {
    payload = { ...payload, ui: envelope.data };
  }

  if (confirmation && payload) {
    payload = {
      ...payload,
      confirmation: {
        pendingId: confirmation.pendingId,
        summary: confirmation.summary,
      },
      saved: false,
    };
  }

  payload = enforceActionTruthOnPayload(payload, actionTruth);

  out.meta = {
    intent,
    envelope,
    messageType,
    payload,
    usageTokens,
    modelCallCount,
    telemetry,
    awaitUser,
    assistantText,
    finishReason: streamFinishReason,
    actionTruth,
    confirmation,
  };
}
