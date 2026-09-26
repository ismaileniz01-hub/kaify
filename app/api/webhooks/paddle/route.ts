import { NextRequest, NextResponse } from "next/server";
import {
  handleNormalizedPaddleEvent,
  verifyAndParsePaddleWebhook,
} from "@/lib/domains/billing";
import { handleApiError } from "@/lib/api/response";
import {
  PADDLE_WEBHOOK_MAX_BYTES,
  readTextBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/api/request-body-limit";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/paddle
 * Paddle Billing subscription lifecycle (SDK signature-verified, raw body).
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await readTextBodyWithLimit(
      request,
      PADDLE_WEBHOOK_MAX_BYTES,
    );
    const signature = request.headers.get("paddle-signature");

    let event;
    try {
      event = await verifyAndParsePaddleWebhook(rawBody, signature);
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid_signature";
      if (message === "webhook_not_configured") {
        return NextResponse.json(
          { error: "webhook_not_configured" },
          { status: 503 },
        );
      }
      if (message === "invalid_json" || message === "missing_event_id" || message === "missing_data") {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      // Non-2xx so Paddle retries — never acknowledge a failed signature.
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    const result = await handleNormalizedPaddleEvent(event);
    if (!result.ok) {
      const status = result.retryable ? 503 : 422;
      return NextResponse.json({ error: result.reason }, { status });
    }

    return NextResponse.json({ received: true, skipped: result.skipped ?? false });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { error: "payload_too_large" },
        { status: 413 },
      );
    }
    return handleApiError(error, { route: "POST /api/webhooks/paddle" });
  }
}
