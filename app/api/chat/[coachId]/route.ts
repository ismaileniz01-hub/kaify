import { ApiError } from "@/lib/api/errors";
import { createSseResponse } from "@/lib/api/sse";
import {
  defineDynamicRoute,
  defineDynamicRouteRaw,
} from "@/lib/api/route-handler";
import { CHAT_TOKEN_RESERVE, reserveQuota } from "@/lib/ai/quota-guard";
import { getHistory, streamCoachReply } from "@/lib/services/chat.service";
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
 * Auth + quota are pre-flighted (JSON envelope on failure); on success the
 * assistant reply streams as `delta` events followed by a `done` event that
 * carries `warning_trigger` (LIMIT_80 / LIMIT_100) + usage.
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

    await reserveQuota({
      userId: user.id,
      resource: "text_tokens",
      amount: CHAT_TOKEN_RESERVE,
    });

    return createSseResponse(
      streamCoachReply({
        userId: user.id,
        coachId: coach.data,
        message: parsed.data.message,
        tokensReserved: CHAT_TOKEN_RESERVE,
      }),
    );
  },
);
