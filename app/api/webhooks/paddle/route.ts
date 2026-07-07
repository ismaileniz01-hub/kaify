import { NextRequest, NextResponse } from "next/server";
import {
  handlePaddleWebhook,
  verifyPaddleSignature,
  type PaddleWebhookPayload,
} from "@/lib/services/billing.service";
import { handleApiError } from "@/lib/api/response";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/paddle
 * Paddle Billing subscription lifecycle (signature-verified).
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET?.trim();
    if (!secret) {
      return NextResponse.json(
        { error: "webhook_not_configured" },
        { status: 503 },
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get("paddle-signature");

    if (!verifyPaddleSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    let payload: PaddleWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as PaddleWebhookPayload;
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const eventId = payload.event_id?.trim();
    if (!eventId) {
      return NextResponse.json({ error: "missing_event_id" }, { status: 400 });
    }

    const result = await handlePaddleWebhook(eventId, payload);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 422 });
    }

    return NextResponse.json({ received: true, skipped: result.skipped ?? false });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/webhooks/paddle" });
  }
}
