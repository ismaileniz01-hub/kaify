import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  allowMethods,
  validateRecaptcha,
  apiError,
  checkDisposableEmail,
  hashEmail,
  parseBodyWithLimit,
} from "@/lib/api-security";
import { logger } from "@/lib/logger";

/**
 * Shared Sender.net subscription handler for the public marketing endpoints
 * (`/api/waitlist` and `/api/subscribe`). Keeps a single implementation of
 * method-guard, body-limit, Zod validation, honeypot, reCAPTCHA, disposable
 * email filtering and the Sender.net upsert so the two routes cannot drift.
 */
type SubscribePayload = {
  email: string;
  firstName: string;
  lastName?: string;
  recaptchaToken: string;
};

export async function handleSenderSubscribe(
  request: NextRequest,
  source: string,
  schema: z.ZodTypeAny,
): Promise<NextResponse> {
  const methodCheck = allowMethods(request, ["POST"]);
  if (methodCheck) return methodCheck;

  try {
    const body = await parseBodyWithLimit(request);
    if (!body) {
      return apiError("Invalid request body.", 400);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Validation error";
      return apiError(firstError, 400);
    }

    const { email, firstName, lastName, recaptchaToken } =
      parsed.data as SubscribePayload;

    const honeypot = (body as Record<string, unknown>).honeypot;
    if (honeypot && typeof honeypot === "string" && honeypot.length > 0) {
      logger.warn(`[${source}] honeypot triggered`, { emailHash: await hashEmail(email) });
      // Signal success to the bot (silent reject).
      return NextResponse.json(
        { success: true, message: "Successfully subscribed!" },
        { status: 200 },
      );
    }

    const isHuman = await validateRecaptcha(recaptchaToken);
    if (!isHuman) {
      logger.warn(`[${source}] reCAPTCHA failed`, { emailHash: await hashEmail(email) });
      return apiError("Bot detected. Please try again.", 403);
    }

    const disposableCheck = checkDisposableEmail(email);
    if (disposableCheck.isDisposable) {
      logger.warn(`[${source}] disposable email blocked`, {
        risk: disposableCheck.risk,
      });
      return apiError("Please use a permanent email address.", 400);
    }

    const apiKey = process.env.SENDER_API_KEY;
    if (!apiKey || apiKey.includes("YOUR_") || apiKey.includes("_here")) {
      logger.error(`[${source}] SENDER_API_KEY is not configured`);
      return apiError("Server configuration error. Please try again later.", 500);
    }

    const senderResponse = await fetch("https://api.sender.net/v2/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        firstname: firstName,
        lastname: lastName || undefined,
        tags: ["kaify-waitlist"],
        groups: ["dPGkyz"],
      }),
    });

    const senderData = await senderResponse.json();

    if (senderResponse.ok) {
      return NextResponse.json(
        { success: true, message: "Successfully subscribed!" },
        { status: 200 },
      );
    }

    const errorBody = JSON.stringify(senderData).toLowerCase();
    if (
      senderResponse.status === 409 ||
      errorBody.includes("already subscribed") ||
      errorBody.includes("already exists")
    ) {
      return NextResponse.json(
        { success: true, message: "You're already on the list!" },
        { status: 200 },
      );
    }

    logger.error(`[${source}] Sender.net error`, { status: senderResponse.status });
    return apiError("Failed to subscribe. Please try again later.", 502);
  } catch (error) {
    logger.error(`[${source}] unexpected error`, {
      error: error instanceof Error ? error.message : "unknown",
    });
    return apiError("An unexpected error occurred. Please try again.", 500);
  }
}
