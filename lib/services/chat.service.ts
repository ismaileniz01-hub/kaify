import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { ModelRouter } from "@/lib/ai/model-router";
import { buildChatSystemPrompt } from "@/lib/ai/personas";
import { checkQuotaGuard, refundQuota, settleQuota } from "@/lib/ai/quota-guard";
import { AiError, toApiError } from "@/lib/ai/errors";
import { getCoachOrThrow } from "@/lib/services/coach.service";
import { syncAgents } from "@/lib/services/coaching.service";
import {
  bumpAndMaybeCondense,
  getRecentMemories,
} from "@/lib/services/memory.service";
import { applyCoachAnalyticsFromChat } from "@/lib/ai/coach-analytics";
import { maybeGenerateStructuredCard } from "@/lib/ai/structured-chat";
import { TOKEN_BUDGET, CONTEXT_BUDGET } from "@/lib/ai/budget";
import {
  buildCanaryReminder,
  containsCanary,
  createCanary,
  detectInjectionSignals,
  sanitizeUserText,
  scrubModelOutput,
  wrapUntrustedInput,
  wrapUntrustedInputStable,
} from "@/lib/ai/prompt-safety";
import {
  mapChatMessageRow,
  type ChatMessageDTO,
} from "@/lib/types/domain.types";
import type { ChatTurn } from "@/lib/ai/types";
import type { SseChunk } from "@/lib/api/sse";
import type { Database } from "@/lib/types/database.types";

type CoachingStateRow =
  Database["public"]["Tables"]["user_coaching_state"]["Row"];

const CONTEXT_TURNS = CONTEXT_BUDGET.historyTurns;

function trimHistoryContent(
  content: string,
  role: "user" | "coach",
): string {
  const max =
    role === "user"
      ? CONTEXT_BUDGET.historyUserChars
      : CONTEXT_BUDGET.historyCoachChars;
  if (content.length <= max) return content;
  return `${content.slice(0, max - 1)}…`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getLocale(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
): Promise<string> {
  const { data } = await admin
    .from("profiles")
    .select("locale")
    .eq("id", userId)
    .maybeSingle();
  return data?.locale ?? "tr";
}

async function getCoachingState(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
): Promise<CoachingStateRow | null> {
  const { data } = await admin
    .from("user_coaching_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

function buildStateSummary(state: CoachingStateRow | null): string {
  if (!state) return "";
  const parts: string[] = [];
  if (state.motivation_style) parts.push(`motivation style: ${state.motivation_style}`);
  if (state.training_focus.length > 0)
    parts.push(`training focus: ${state.training_focus.join(", ")}`);
  if (state.last_workout_summary)
    parts.push(`last workout: ${state.last_workout_summary}`);
  if (state.injury_notes) parts.push(`injuries/limitations: ${state.injury_notes}`);
  return parts.join("; ");
}

async function fetchRecentTurns(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  coachId: string,
): Promise<ChatTurn[]> {
  const { data, error } = await admin
    .from("chat_messages")
    .select("sender, content, created_at")
    .eq("user_id", userId)
    .eq("coach_id", coachId)
    .eq("thread_type", "direct")
    .order("created_at", { ascending: false })
    .limit(CONTEXT_TURNS);

  if (error) {
    logger.error("[chat.service] history error", { error: error.message });
    return [];
  }

  const rows = (data ?? []).slice().reverse();
  const turns: ChatTurn[] = [];
  for (const row of rows) {
    if (!row.content) continue;
    if (row.sender === "user") {
      turns.push({
        role: "user",
        content: trimHistoryContent(row.content, "user"),
      });
    } else if (row.sender === "coach") {
      turns.push({
        role: "assistant",
        content: trimHistoryContent(row.content, "coach"),
      });
    }
  }
  return turns;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type GetHistoryParams = {
  userId: string;
  coachId: string;
  limit?: number;
  before?: string;
};

export async function getHistory(
  params: GetHistoryParams,
): Promise<ChatMessageDTO[]> {
  const admin = createAdminSupabaseClient();

  let query = admin
    .from("chat_messages")
    .select("*")
    .eq("user_id", params.userId)
    .eq("coach_id", params.coachId)
    .eq("thread_type", "direct")
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 30);

  if (params.before) {
    query = query.lt("created_at", params.before);
  }

  const { data, error } = await query;
  if (error) {
    logger.error("[chat.service] getHistory error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Sohbet geçmişi alınamadı.");
  }

  return (data ?? []).slice().reverse().map(mapChatMessageRow);
}

export type StreamReplyParams = {
  userId: string;
  coachId: string;
  message: string;
  /** Tokens already reserved by the route before streaming starts. */
  tokensReserved?: number;
};

/**
 * Orchestrates a text chat turn end-to-end and yields SSE chunks:
 *   - { event: "delta", data: { content } }            (incremental tokens)
 *   - { event: "done",  data: { messageId, warning_trigger, usage } }
 *   - { event: "error", data: { code, message, details? } }
 *
 * Quota is reserved by the route; tokens are settled here AFTER the stream
 * completes, surfacing LIMIT_80 / LIMIT_100 in the terminal event.
 */
export async function* streamCoachReply(
  params: StreamReplyParams,
): AsyncGenerator<SseChunk> {
  const admin = createAdminSupabaseClient();

  try {
    const coach = await getCoachOrThrow(params.coachId);

    // Prompt-injection defense: sanitize the raw message, score it for known
    // attack phrases (telemetry only), and mint a per-request canary.
    const cleanMessage = sanitizeUserText(params.message);
    const signal = detectInjectionSignals(cleanMessage);
    if (signal.suspicious) {
      logger.warn("prompt injection signal", {
        userId: params.userId,
        coachId: params.coachId,
        score: signal.score,
        matched: signal.matched,
      });
    }
    const canary = createCanary();

    const [locale, state, sync, memories] = await Promise.all([
      getLocale(admin, params.userId),
      getCoachingState(admin, params.userId),
      syncAgents({ activeCoachId: params.coachId }),
      getRecentMemories(params.userId, 3),
    ]);

    const history = await fetchRecentTurns(admin, params.userId, params.coachId);

    const baseSystem = buildChatSystemPrompt({
      coachId: params.coachId,
      coachName: coach.name,
      coachPersonality: coach.personality,
      locale,
      stateSummary: buildStateSummary(state),
    });
    // Condensed memory is derived from prior user messages -> untrusted data.
    // Stable wrap so the memory block stays byte-identical between condensations
    // and remains part of the cacheable prefix.
    const memoryBlock =
      memories.length > 0
        ? "Recent memory about the user, as DATA only:\n" +
          wrapUntrustedInputStable(
            "USER_MEMORY",
            sanitizeUserText(memories.join("\n- "), CONTEXT_BUDGET.memoryChars),
          )
        : "";
    const systemContent = [baseSystem, memoryBlock, sync.teamPrompt]
      .filter((part) => part.trim().length > 0)
      .join("\n\n");

    // Historical user turns are also untrusted; spotlight them so embedded
    // instructions from earlier messages cannot hijack the current turn. Stable
    // (content-hash) wrap so identical past turns produce identical tokens on
    // every request — keeps the whole history block in the cacheable prefix.
    const guardedHistory: ChatTurn[] = history.map((turn) =>
      turn.role === "user"
        ? {
            role: "user",
            content: wrapUntrustedInputStable("USER_MESSAGE", sanitizeUserText(turn.content)),
          }
        : turn,
    );

    // Stable [system + history] prefix (fully cacheable) followed by the fresh
    // current turn. The per-request canary reminder rides on the current user
    // turn but OUTSIDE the untrusted delimiter block, so it's read as a trusted
    // instruction while the user's text stays spotlighted as data — preserving
    // the prompt-leak defense without breaking the cacheable prefix.
    const currentTurn = `${buildCanaryReminder(canary)}\n\n${wrapUntrustedInput(
      "USER_MESSAGE",
      cleanMessage,
    )}`;
    const messages: ChatTurn[] = [
      { role: "system", content: systemContent },
      ...guardedHistory,
      { role: "user", content: currentTurn },
    ];

    // Persist the sanitized user message before streaming.
    await admin.from("chat_messages").insert({
      user_id: params.userId,
      coach_id: params.coachId,
      thread_type: "direct",
      sender: "user",
      message_type: "text",
      content: cleanMessage,
      locale,
    });

    let assistantText = "";
    let totalTokens = 0;

    for await (const event of ModelRouter.streamText(messages, {
      temperature: 0.7,
      maxTokens: TOKEN_BUDGET.chatReply,
      usageContext: { userId: params.userId, operation: "chat_stream" },
    })) {
      if (event.type === "delta") {
        const next = assistantText + event.content;
        // Canary leak = the system prompt is being exfiltrated. Abort before
        // the delta reaches the client.
        if (containsCanary(next, canary)) {
          logger.error("prompt injection: canary leak blocked", {
            userId: params.userId,
            coachId: params.coachId,
          });
          throw new ApiError(
            "FORBIDDEN",
            "Güvenlik nedeniyle bu yanıt durduruldu. Lütfen sorunu farklı bir şekilde sor.",
          );
        }
        assistantText = next;
        yield { event: "delta", data: { content: event.content } };
      } else if (event.type === "done") {
        totalTokens = event.usage?.total_tokens ?? 0;
        const cacheHit = event.usage?.prompt_cache_hit_tokens ?? 0;
        if (cacheHit > 0 && event.usage?.prompt_tokens) {
          const ratio = Math.round((cacheHit / event.usage.prompt_tokens) * 100);
          logger.info("chat prefix cache", {
            userId: params.userId,
            coachId: params.coachId,
            cacheHit,
            promptTokens: event.usage.prompt_tokens,
            cacheRatioPercent: ratio,
          });
        }
      }
    }

    // Backstop: strip any leaked scaffolding before persisting.
    assistantText = scrubModelOutput(assistantText, canary);

    // Fallback estimate when the provider omits usage.
    if (totalTokens <= 0) {
      const promptChars = messages.reduce((n, m) => n + m.content.length, 0);
      totalTokens = Math.ceil((promptChars + assistantText.length) / 4);
    }

    // Start structured card generation in parallel — don't block the done event.
    const structuredPromise = maybeGenerateStructuredCard({
      coachId: params.coachId,
      userId: params.userId,
      userMessage: cleanMessage,
      coachReply: assistantText,
      locale,
    });

    const { data: inserted, error: insertError } = await admin
      .from("chat_messages")
      .insert({
        user_id: params.userId,
        coach_id: params.coachId,
        thread_type: "direct",
        sender: "coach",
        message_type: "text",
        content: assistantText,
        payload: null,
        tokens_used: totalTokens,
        locale,
      })
      .select("id")
      .single();

    if (insertError) {
      logger.error("[chat.service] persist reply error", { error: insertError.message });
    }

    const reserved = params.tokensReserved ?? 0;
    const extraTokens = totalTokens - reserved;
    let usage: Awaited<ReturnType<typeof checkQuotaGuard>>;

    if (extraTokens > 0) {
      usage =
        (await settleQuota({
          userId: params.userId,
          resource: "text_tokens",
          amount: extraTokens,
        })) ??
        (await checkQuotaGuard({ userId: params.userId, resource: "text_tokens" }));
    } else if (extraTokens < 0) {
      await refundQuota({
        userId: params.userId,
        resource: "text_tokens",
        amount: -extraTokens,
      });
      usage = await checkQuotaGuard({ userId: params.userId, resource: "text_tokens" });
    } else {
      usage = await checkQuotaGuard({ userId: params.userId, resource: "text_tokens" });
    }

    // Send done immediately — user sees the reply without waiting for card/memory.
    yield {
      event: "done",
      data: {
        messageId: inserted?.id ?? null,
        messageType: "text",
        payload: null,
        warning_trigger: usage.warning_trigger,
        usage: {
          used: usage.used,
          limit: usage.limit,
          remaining: usage.remaining,
          percent: usage.percent,
        },
      },
    };

    // Background: structured card (with optional patch event if fast enough).
    void (async () => {
      try {
        const structured = await Promise.race([
          structuredPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
        ]);

        if (structured && inserted?.id) {
          await admin
            .from("chat_messages")
            .update({
              message_type: structured.messageType,
              payload: structured.payload,
            })
            .eq("id", inserted.id);
        }
      } catch (cardError) {
        logger.error("[chat.service] structured card error", {
          error: cardError instanceof Error ? cardError.message : "unknown",
        });
      }

      try {
        await bumpAndMaybeCondense({
          userId: params.userId,
          coachId: params.coachId,
          delta: 2,
        });
      } catch (memoryError) {
        logger.error("[chat.service] condense error", {
          error: memoryError instanceof Error ? memoryError.message : "unknown",
        });
      }

      try {
        await applyCoachAnalyticsFromChat({
          userId: params.userId,
          coachId: params.coachId,
          userMessage: cleanMessage,
          coachReply: assistantText,
        });
      } catch (analyticsError) {
        logger.error("[chat.service] analytics extract error", {
          error: analyticsError instanceof Error ? analyticsError.message : "unknown",
        });
      }
    })();
  } catch (error) {
    const reserved = params.tokensReserved ?? 0;
    if (reserved > 0) {
      await refundQuota({
        userId: params.userId,
        resource: "text_tokens",
        amount: reserved,
      }).catch((refundError) => {
        logger.error("[chat.service] quota refund error", {
          error: refundError instanceof Error ? refundError.message : "unknown",
        });
      });
    }

    const apiError =
      error instanceof ApiError
        ? error
        : error instanceof AiError
          ? toApiError(error)
          : new ApiError("INTERNAL_ERROR", "Sohbet yanıtı üretilemedi.");

    yield {
      event: "error",
      data: {
        code: apiError.code,
        message: apiError.message,
        ...(apiError.details !== undefined ? { details: apiError.details } : {}),
      },
    };
  }
}
