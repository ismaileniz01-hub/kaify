/**
 * KAIOS request orchestrator — single conversational inference for normal turns.
 *
 * Streaming protocol (plan §4):
 * - needs_structure=false → DeepSeek stream → SSE delta* → done envelope
 * - needs_structure=true  → DeepSeek stream (JSON held) → live `message`
 *   field deltas → done (+ card from the same envelope)
 *
 * Never calls structured-chat second LLM.
 */

import { ModelRouter } from "@/lib/ai/model-router";
import { extractJsonObject } from "@/lib/ai/extract-json";
import {
  ensureStructuredPlanVisible,
  parseWorkoutDaysFromSpeech,
  workoutDayHasLifts,
} from "@/lib/kaios/plan-speech";
import {
  containsCanary,
  scrubModelOutput,
  visibleStreamDelta,
} from "@/lib/ai/prompt-safety";
import {
  coachVisibleMessage,
  looksLikeJsonStreamPrefix,
  partialJsonStringField,
} from "@/lib/kaios/envelope-text";
import type { ChatTurn, TokenUsage } from "@/lib/ai/types";
import { lastAssistantMessage } from "@/lib/kaios/context/short-turn";
import { buildRuntimeContext } from "@/lib/kaios/context/builder";
import { compilePrompt } from "@/lib/kaios/compiler/prompt";
import {
  needsStructuredOutput,
  previousOffersMealSave,
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
  resolveEquipmentPreference,
} from "@/lib/kaios/tools/dispatch";
import { maybeQueueCoachLogConfirmation, looksLikeChatYes } from "@/lib/kaios/analytics/chat-log";
import { confirmLatestPendingAnalytics } from "@/lib/services/analytics-confirmation.service";
import type { PendingAnalyticsPayload } from "@/lib/analytics/confirmation-payload";
import { ensureMayaMealWaterReminder } from "@/lib/kaios/maya/meal-water";
import { relabelMayaMacroLabels } from "@/lib/kaios/maya/macro-labels";
import { ensureAlexDailyCardio } from "@/lib/kaios/alex/daily-cardio";
import { ensureMayaMealSaveAsk } from "@/lib/kaios/maya/meal-save-ask";
import { ensureMayaAlexHandoff } from "@/lib/kaios/maya/alex-handoff";
import { ensureMayaAnalyticsSavedAck } from "@/lib/kaios/maya/analytics-ack";
import {
  coachRetryLine,
  isCoachRetryLine,
  looksLikeUnsafeCoachText,
  scrubAlexGenderedAddress,
  sanitizeCoachVisibleText,
} from "@/lib/kaios/coach-retry";
import {
  actionTruthHintForPrompt,
  enforceActionTruthOnPayload,
  scrubFalseSuccessClaims,
  type ActionTruthRecord,
} from "@/lib/kaios/tools/action-truth";
import { logger } from "@/lib/logger";
import type { SseChunk } from "@/lib/api/sse";
import type { MessageType } from "@/lib/types/database.types";

function truthsFromChatYes(
  applied: PendingAnalyticsPayload,
): ActionTruthRecord[] {
  const truths: ActionTruthRecord[] = [];
  if (applied.meal) {
    truths.push({
      status: "SUCCEEDED",
      tool: "saveMealMacros",
      message: "Confirmed from chat yes",
      data: { saved: true, ...applied.meal },
    });
  }
  const waterLiters = Number(
    applied.patch?.waterLiters ?? applied.patch?.water_liters,
  );
  if (Number.isFinite(waterLiters) && waterLiters > 0) {
    truths.push({
      status: "SUCCEEDED",
      tool: "recordHydration",
      message: "Confirmed from chat yes",
      data: { saved: true, waterLiters },
    });
  }
  if (
    truths.length === 0 &&
    applied.patch &&
    Object.keys(applied.patch).length > 0
  ) {
    truths.push({
      status: "SUCCEEDED",
      tool: "logWorkout",
      message: "Confirmed from chat yes",
      data: { saved: true, ...applied.patch },
    });
  }
  return truths;
}

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
  maxTokens?: number;
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

function hasWorkoutPlanUi(envelope: BaseEnvelope): boolean {
  if (!envelope.ui || typeof envelope.ui !== "object" || Array.isArray(envelope.ui)) {
    return false;
  }
  const ui = envelope.ui as Record<string, unknown>;
  return (
    ui.cardType === "workout_plan" &&
    Array.isArray(ui.days) &&
    ui.days.some(workoutDayHasLifts)
  );
}

function coerceWorkoutPlanEnvelope(
  coach: CoachId,
  text: string,
): BaseEnvelope | null {
  const parsed = parseWorkoutDaysFromSpeech(text);
  const validDays = parsed.filter((day) => (day.exercises?.length ?? 0) > 0);
  if (validDays.length === 0) return null;

  return {
    schema_version: SCHEMA_VERSION,
    coach,
    intent: "programming",
    message: text.trim(),
    data: {
      status: "proposed",
    },
    ui: {
      cardType: "workout_plan",
      days: validDays.map((day) => ({
        dayKey: day.dayKey || day.day || "",
        focusKey: day.focus || day.focusKey || "",
        exercises: (day.exercises ?? []).map((ex) => ({
          name: ex.name ?? "",
          sets: typeof ex.sets === "number" ? ex.sets : Number(ex.sets) || ex.sets,
          reps: String(ex.reps ?? ""),
          notes: ex.notes,
        })),
      })),
    },
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
      ? 'For weekly training plans, ui.cardType MUST be "workout_plan" and ui.days MUST list every training day with lifts, sets, and reps. The spoken message MUST also list those days and lifts (name + sets x reps) so the user can read the program without the card. After the list, add short form cues — never replace the schedule with cues-only. If they ask to write the days, write them. If USER_CONTEXT primary_goal is lose_weight or recomposition, every ui.days item MUST end with 30 min Zone 2 cardio as the last exercise.'
      : "The spoken message must still contain the user-facing plan (meals, numbers, days). data/ui is a card extra, never a substitute for the message.",
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
  const previousAssistant =
    lastAssistantMessage(input.conversationTurns) ?? undefined;
  const intent = resolveIntent({
    coach: input.coachId,
    message: input.message,
    hasImage: input.hasImage,
    previousAssistantMessage: previousAssistant,
    hasRecentHistory: (input.conversationTurns?.length ?? 0) > 0,
  });

  // Bounded read prefetch (0–1) before model — never writes.
  const prefetch = await prefetchToolKnowledge({
    userId: input.userId,
    coach: input.coachId,
    intent,
    message: input.message,
    userState: input.userState,
    memoryItems: input.memoryItems,
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
    intent,
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
  let holdJsonStream = false;
  let streamedVisible = "";
  let envelope: BaseEnvelope;
  let awaitUser = false;
  let actionTruth: ActionTruthRecord[] = [...prefetch.truths];
  let confirmation:
    | {
        pendingId: string;
        summary: string;
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        waterLiters?: number;
      }
    | undefined;
  let appliedExistingConfirmation = false;

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
          assistantText = coachRetryLine(input.locale);
          break;
        }
        assistantText = next;
        if (looksLikeJsonStreamPrefix(next)) {
          holdJsonStream = true;
          const extracted = partialJsonStringField(next, "message");
          if (extracted && extracted.length > streamedVisible.length) {
            yield {
              event: "delta",
              data: { content: extracted.slice(streamedVisible.length) },
            };
            streamedVisible = extracted;
          }
          continue;
        }
        const visible = visibleStreamDelta(previous, next);
        if (visible) {
          yield { event: "delta", data: { content: visible } };
          streamedVisible += visible;
        }
      } else if (event.type === "done") {
        providerUsage = event.usage;
        usageTokens = event.usage?.total_tokens ?? 0;
        if (event.finishReason) streamFinishReason = event.finishReason;
      }
    }
    assistantText = coachVisibleMessage(
      scrubModelOutput(assistantText, compiled.canary),
    );
    if (holdJsonStream && assistantText.length > streamedVisible.length) {
      const rest = assistantText.slice(streamedVisible.length);
      const chunkSize = 48;
      for (let i = 0; i < rest.length; i += chunkSize) {
        yield {
          event: "delta",
          data: { content: rest.slice(i, i + chunkSize) },
        };
      }
    }
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

    for await (const event of ModelRouter.streamText(messages, {
      temperature: Math.min(temperature, 0.5),
      maxTokens: ctx.maxTokens,
      signal: input.signal,
      usageContext: {
        userId: input.userId,
        operation: "kaios_chat_structured",
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
        const next = assistantText + event.content;
        if (containsCanary(next, compiled.canary)) {
          logger.error("kaios: canary leak blocked", {
            userId: input.userId,
            coachId: input.coachId,
          });
          assistantText = coachRetryLine(input.locale);
          break;
        }
        assistantText = next;
        const extracted = partialJsonStringField(next, "message");
        if (extracted && extracted.length > streamedVisible.length) {
          yield {
            event: "delta",
            data: { content: extracted.slice(streamedVisible.length) },
          };
          streamedVisible = extracted;
        }
      } else if (event.type === "done") {
        providerUsage = event.usage;
        usageTokens = event.usage?.total_tokens ?? 0;
        if (event.finishReason) streamFinishReason = event.finishReason;
      }
    }

    const scrubbed = scrubModelOutput(assistantText, compiled.canary);
    const parsed = tryParseJsonObject(scrubbed);
    const envelopeResult = parsed ? parseBaseEnvelope(parsed) : null;

    if (envelopeResult?.ok) {
      envelope = envelopeResult.data;
      if (intent === "programming" && !hasWorkoutPlanUi(envelope)) {
        const coerced = coerceWorkoutPlanEnvelope(input.coachId, envelope.message);
        if (coerced) envelope = coerced;
      }
      assistantText = envelope.message;
    } else {
      assistantText = coachVisibleMessage(scrubbed);
      if (!assistantText.trim() && streamedVisible.trim()) {
        assistantText = streamedVisible.trim();
      }
      const coerced =
        intent === "programming"
          ? coerceWorkoutPlanEnvelope(input.coachId, assistantText)
          : null;
      envelope = coerced ?? casualEnvelope(input.coachId, assistantText, intent);
      if (coerced) {
        assistantText = envelope.message;
      } else {
        logger.warn("kaios: structured parse failed; text fallback", {
          coachId: input.coachId,
          intent,
        });
      }
    }

    if (assistantText.length > streamedVisible.length) {
      const rest = assistantText.slice(streamedVisible.length);
      const chunkSize = 48;
      for (let i = 0; i < rest.length; i += chunkSize) {
        yield {
          event: "delta",
          data: { content: rest.slice(i, i + chunkSize) },
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
    expectedEquipment: resolveEquipmentPreference({
      userState: input.userState,
      memoryItems: input.memoryItems,
    }),
  });
  actionTruth = [...actionTruth, ...post.truths];
  if (post.confirmation) confirmation = post.confirmation;

  if (
    !confirmation &&
    looksLikeChatYes(input.message) &&
    (input.coachId === "maya" || input.coachId === "alex")
  ) {
    try {
      const applied = await confirmLatestPendingAnalytics(input.userId);
      if (applied) {
        appliedExistingConfirmation = true;
        actionTruth = [...actionTruth, ...truthsFromChatYes(applied)];
      }
    } catch (error) {
      logger.warn("[orchestrator] chat-yes confirmation failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  if (!confirmation && !appliedExistingConfirmation && assistantText.trim().length > 0) {
    const foodLog = await maybeQueueMayaFoodLogConfirmation({
      userId: input.userId,
      coach: input.coachId,
      userMessage: input.message,
      assistantText,
      alreadyConfirming: false,
      envelopeData: envelope.data,
      envelopeUi: envelope.ui,
      previousAssistantText: previousAssistant,
    });
    actionTruth = [...actionTruth, ...foodLog.truths];
    if (foodLog.confirmation) confirmation = foodLog.confirmation;

    if (
      confirmation &&
      looksLikeChatYes(input.message) &&
      input.coachId === "maya" &&
      previousOffersMealSave(previousAssistant)
    ) {
      try {
        const applied = await confirmLatestPendingAnalytics(input.userId);
        if (applied) {
          appliedExistingConfirmation = true;
          confirmation = undefined;
          actionTruth = [
            ...actionTruth.filter((t) => t.status !== "PENDING_CONFIRMATION"),
            ...truthsFromChatYes(applied),
          ];
        }
      } catch (error) {
        logger.warn("[orchestrator] reconstructed meal yes failed", {
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }

  const mealSaved = actionTruth.some(
    (t) => t.tool === "saveMealMacros" && t.status === "SUCCEEDED",
  );
  let waterSaved = actionTruth.some(
    (t) => t.tool === "recordHydration" && t.status === "SUCCEEDED",
  );

  if (!confirmation && !appliedExistingConfirmation) {
    const coachLog = await maybeQueueCoachLogConfirmation({
      userId: input.userId,
      coach: input.coachId,
      userMessage: input.message,
      assistantText,
      previousAssistantMessage: previousAssistant,
      alreadyConfirming: Boolean(confirmation),
    });
    actionTruth = [...actionTruth, ...coachLog.truths];
    if (coachLog.confirmation) confirmation = coachLog.confirmation;
    if (
      coachLog.truths.some(
        (t) => t.tool === "recordHydration" && t.status === "SUCCEEDED",
      )
    ) {
      waterSaved = true;
    }
  }

  // Downgrade invalid Alex program cards.
  const idValidationFailed = post.truths.some(
    (t) =>
      t.tool === "validateExerciseIds" && t.status === "FAILED",
  );
  if (idValidationFailed) {
    const keepPlanUi = hasWorkoutPlanUi(envelope);
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
      ...(keepPlanUi ? {} : { ui: undefined }),
    };
    assistantText = envelope.message;
  }

  assistantText = ensureMayaAlexHandoff({
    text: relabelMayaMacroLabels({
      text: ensureMayaMealSaveAsk({
        text: ensureMayaMealWaterReminder({
          text: sanitizeCoachVisibleText(
            coachVisibleMessage(scrubFalseSuccessClaims(assistantText, actionTruth)),
            input.locale,
            input.coachId,
          ),
          locale: input.locale,
          coachId: input.coachId,
          intent,
          userMessage: input.message,
        }),
        locale: input.locale,
        coachId: input.coachId,
        intent,
        userMessage: input.message,
      }),
      locale: input.locale,
      coachId: input.coachId,
    }),
    locale: input.locale,
    coachId: input.coachId,
    userMessage: input.message,
  });
  if (
    isCoachRetryLine(assistantText) &&
    streamedVisible.trim().length >= 40 &&
    !looksLikeUnsafeCoachText(streamedVisible)
  ) {
    assistantText = streamedVisible.trim();
  }
  assistantText = ensureStructuredPlanVisible({
    intent,
    message: assistantText,
    ui: envelope.ui,
    data: envelope.data,
  });
  envelope = ensureAlexDailyCardio({
    coachId: input.coachId,
    intent,
    locale: input.locale,
    userState: input.userState,
    envelope: { ...envelope, message: assistantText },
  });
  assistantText = envelope.message;
  if (input.coachId === "alex") {
    const userGender =
      input.userState?.match(/\buser_gender:\s*(male|female)\b/i)?.[1]?.toLowerCase() ??
      null;
    assistantText = scrubAlexGenderedAddress({
      text: assistantText,
      locale: input.locale,
      userGender,
    });
  }
  assistantText = ensureMayaAnalyticsSavedAck({
    text: assistantText,
    locale: input.locale,
    coachId: input.coachId,
    mealSaved,
    waterSaved,
  });
  envelope = { ...envelope, message: assistantText };

  if (assistantText.length > streamedVisible.length) {
    const rest = assistantText.slice(streamedVisible.length);
    const chunkSize = 48;
    for (let i = 0; i < rest.length; i += chunkSize) {
      yield {
        event: "delta",
        data: { content: rest.slice(i, i + chunkSize) },
      };
    }
  }

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

  const messageType = messageTypeForIntent(intent, envelope);

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
        ...(confirmation.calories != null ? { calories: confirmation.calories } : {}),
        ...(confirmation.protein != null ? { protein: confirmation.protein } : {}),
        ...(confirmation.carbs != null ? { carbs: confirmation.carbs } : {}),
        ...(confirmation.fat != null ? { fat: confirmation.fat } : {}),
        ...(confirmation.waterLiters != null
          ? { waterLiters: confirmation.waterLiters }
          : {}),
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
    maxTokens: ctx.maxTokens,
    finishReason: streamFinishReason,
    actionTruth,
    confirmation,
  };
}
