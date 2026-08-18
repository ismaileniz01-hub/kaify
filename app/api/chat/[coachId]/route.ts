import { ApiError } from "@/lib/api/errors";
import { createSseResponse, type SseChunk } from "@/lib/api/sse";
import {
  defineDynamicRoute,
  defineDynamicRouteRaw,
} from "@/lib/api/route-handler";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import {
  claimIdempotency,
  completeIdempotency,
  releaseIdempotency,
} from "@/lib/api/idempotency-store";
import { CHAT_TOKEN_RESERVE, reserveQuota } from "@/lib/ai/quota-guard";
import { getHistory, streamCoachReply } from "@/lib/domains/ai";
import {
  MAX_JSON_BODY_CHAT,
  parseJsonWithLimit,
} from "@/lib/security/body-limit";
import {
  coachIdSchema,
  historyQuerySchema,
  sendMessageSchema,
} from "@/lib/validations/chat.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatReplayBody = {
  assistantText: string;
  messageId: string | null;
  userMessageId?: string | null;
  messageType: string | null;
  payload: unknown;
  warning_trigger: string | null;
  usage: unknown;
};

async function* replayChatSse(body: ChatReplayBody): AsyncGenerator<SseChunk> {
  if (body.assistantText) {
    yield { event: "delta", data: { content: body.assistantText } };
  }
  yield {
    event: "done",
    data: {
      messageId: body.messageId,
      userMessageId: body.userMessageId ?? null,
      messageType: body.messageType,
      payload: body.payload,
      warning_trigger: body.warning_trigger,
      usage: body.usage,
      replayed: true,
    },
  };
}

async function* withChatIdempotency(
  userId: string,
  endpoint: string,
  key: string | null,
  inner: AsyncGenerator<SseChunk>,
): AsyncGenerator<SseChunk> {
  let assistantText = "";
  let replay: ChatReplayBody | null = null;
  let failed = false;
  try {
    for await (const chunk of inner) {
      if (chunk.event === "delta") {
        const content = (chunk.data as { content?: string })?.content;
        if (typeof content === "string") assistantText += content;
      }
      if (chunk.event === "done") {
        const data = chunk.data as Record<string, unknown>;
        replay = {
          assistantText,
          messageId: (data.messageId as string | null) ?? null,
          userMessageId: (data.userMessageId as string | null) ?? null,
          messageType: (data.messageType as string | null) ?? null,
          payload: data.payload,
          warning_trigger: (data.warning_trigger as string | null) ?? null,
          usage: data.usage ?? null,
        };
      }
      if (chunk.event === "error") failed = true;
      yield chunk;
    }
  } catch (error) {
    failed = true;
    await releaseIdempotency(userId, endpoint, key);
    throw error;
  }

  if (failed || !replay) {
    await releaseIdempotency(userId, endpoint, key);
    return;
  }
  await completeIdempotency(userId, endpoint, key, replay);
}

/** GET /api/chat/[coachId] — paginated chat history (newest-last). */
export const GET = defineDynamicRoute<{ coachId: string }>(
  { route: "GET /api/chat/[coachId]" },
  async ({ user, request, params }) => {
    const coach = coachIdSchema.safeParse(params.coachId);
    if (!coach.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz koç.");
    }

    const url = new URL(request.url);
    const query = historyQuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
      before: url.searchParams.get("before") ?? undefined,
    });
    if (!query.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz sorgu.", query.error.issues);
    }

    return getHistory({
      userId: user.id,
      coachId: coach.data,
      limit: query.data.limit,
      before: query.data.before,
    });
  },
);

/**
 * POST /api/chat/[coachId] — streamed DeepSeek reply (SSE).
 *
 * Retry / reconnect: clients MUST reuse the same Idempotency-Key.
 * - in-flight duplicate → 409 CONFLICT (no second quota/message)
 * - completed turn → SSE replay of the stored assistant text (no second AI call)
 * - failed turn releases the key so a later retry may execute once
 */
export const POST = defineDynamicRouteRaw<{ coachId: string }>(
  {
    route: "POST /api/chat/[coachId]",
    rateLimit: "chat",
    requireAi: true,
    dailyAiBudget: true,
    requireTermsConsent: true,
    requireAiConsent: true,
  },
  async ({ user, request, params }) => {
    const coach = coachIdSchema.safeParse(params.coachId);
    if (!coach.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz koç.");
    }

    const body = await parseJsonWithLimit(request, MAX_JSON_BODY_CHAT);
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz istek.", parsed.error.issues);
    }

    const key = getOptionalIdempotencyKey(request);
    const endpoint = `POST /api/chat/${coach.data}`;
    const claim = await claimIdempotency<ChatReplayBody>({
      userId: user.id,
      endpoint,
      key,
      requestBody: { message: parsed.data.message, coachId: coach.data },
    });

    if (claim.kind === "replay") {
      return createSseResponse(replayChatSse(claim.body));
    }

    try {
      await reserveQuota({
        userId: user.id,
        resource: "text_tokens",
        amount: CHAT_TOKEN_RESERVE,
      });
    } catch (error) {
      await releaseIdempotency(user.id, endpoint, key);
      throw error;
    }

    const abort = new AbortController();
    const onAbort = () => abort.abort();
    request.signal.addEventListener("abort", onAbort, { once: true });

    return createSseResponse(
      withChatIdempotency(
        user.id,
        endpoint,
        key,
        streamCoachReply({
          userId: user.id,
          coachId: coach.data,
          message: parsed.data.message,
          tokensReserved: CHAT_TOKEN_RESERVE,
          clientIdempotencyKey: key,
          clientMessageId: parsed.data.clientMessageId ?? null,
          signal: abort.signal,
        }),
      ),
      { onDisconnect: () => abort.abort() },
    );
  },
);
