import { NextRequest } from "next/server";
import { requireUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { handleApiError, ok } from "@/lib/api/response";
import { createSseResponse } from "@/lib/api/sse";
import { enforceUserRateLimit } from "@/lib/api/rate-guard";
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

type RouteContext = { params: Promise<{ coachId: string }> };

/** GET /api/chat/[coachId] — paginated chat history (newest-last). */
export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const user = await requireUser();

    const { coachId } = await ctx.params;
    const coach = coachIdSchema.safeParse(coachId);
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

    const history = await getHistory({
      userId: user.id,
      coachId: coach.data,
      limit: query.data.limit,
      before: query.data.before,
    });

    return ok(history);
  } catch (error) {
    return handleApiError(error, { route: "/api/chat/[coachId]" });
  }
}

/**
 * POST /api/chat/[coachId] — streamed DeepSeek reply (SSE).
 * Auth + quota are pre-flighted (JSON envelope on failure); on success the
 * assistant reply streams as `delta` events followed by a `done` event that
 * carries `warning_trigger` (LIMIT_80 / LIMIT_100) + usage.
 */
export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const user = await requireUser();

    const { coachId } = await ctx.params;
    const coach = coachIdSchema.safeParse(coachId);
    if (!coach.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz koç.");
    }

    await enforceUserRateLimit(user.id, "chat");

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
  } catch (error) {
    return handleApiError(error, { route: "/api/chat/[coachId]" });
  }
}
