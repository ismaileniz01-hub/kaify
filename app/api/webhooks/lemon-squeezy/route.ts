import { NextRequest } from "next/server";
import { handleApiError, fail, ok } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import {
  handleLemonSqueezyWebhook,
  verifyLemonSqueezySignature,
} from "@/lib/services/billing.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/webhooks/lemon-squeezy
 * Lemon Squeezy subscription lifecycle (HMAC-verified).
 * Configure checkout custom_data.user_id for reliable tier mapping.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
    if (!secret) {
      logger.error("billing.webhook secret not configured");
      return fail(new ApiError("INTERNAL_ERROR", "Webhook yapılandırması eksik."));
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-signature");

    if (!verifyLemonSqueezySignature(rawBody, signature, secret)) {
      throw new ApiError("FORBIDDEN", "Geçersiz webhook imzası.");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz webhook JSON.");
    }

    const meta = (payload as { meta?: { webhook_id?: string } }).meta;
    const eventId =
      meta?.webhook_id ??
      request.headers.get("x-event-id") ??
      `${Date.now()}`;

    const result = await handleLemonSqueezyWebhook(
      String(eventId),
      payload as Parameters<typeof handleLemonSqueezyWebhook>[1],
    );

    return ok({ received: true, ...result });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/webhooks/lemon-squeezy" });
  }
}
