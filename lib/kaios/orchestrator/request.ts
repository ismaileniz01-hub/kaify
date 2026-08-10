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
import {
  containsCanary,
  scrubModelOutput,
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
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as unknown;
    } catch {
      return null;
    }
  }
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
      '", "data":{}, "ui":{} }',
    "Omit unused fields. message is localized natural coach speech.",
    "Do not duplicate structured numbers already in data/ui inside message.",
    "No generic closing. Answer directly.",
  ].join(" ");
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

  const ctx = buildRuntimeContext({
    coach: input.coachId,
    message: input.message,
    locale: input.locale,
    userState: input.userState,
    memoryItems: input.memoryItems,
    teamFacts: input.teamFacts,
    knowledge: input.knowledge,
    conversationTurns: input.conversationTurns,
    hasImage: input.hasImage,
  });

  const compiled = compilePrompt(ctx);
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
  let envelope: BaseEnvelope;
  let awaitUser = false;

  if (!needsStructuredOutput(intent)) {
    modelCallCount = 1;
    for await (const event of ModelRouter.streamText(compiled.messages, {
      temperature,
      maxTokens: ctx.maxTokens,
      usageContext: {
        userId: input.userId,
        operation: "kaios_chat_stream",
      },
    })) {
      if (event.type === "delta") {
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
        yield { event: "delta", data: { content: event.content } };
      } else if (event.type === "done") {
        providerUsage = event.usage;
        usageTokens = event.usage?.total_tokens ?? 0;
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
  let payload: Record<string, unknown> | null =
    messageType === "text" && !envelope.data && !envelope.ui
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
  };
}
