import { NextRequest, NextResponse } from "next/server";
import {
  allowMethods,
  validateRecaptcha,
  apiError,
  subscribeSchema,
  checkDisposableEmail,
  hashEmail,
  parseBodyWithLimit,
} from "@/lib/api-security";

/**
 * POST /api/subscribe
 *
 * Subscribe kaydı alır, Zod ile doğrular, reCAPTCHA kontrolü yapar,
 * disposable email kontrolü yapar ve Sender.net API'sine iletir.
 */
export async function POST(request: NextRequest) {
  // Method kontrolü
  const methodCheck = allowMethods(request, ["POST"]);
  if (methodCheck) return methodCheck;

  try {
    // Body boyut limiti + parse
    const body = await parseBodyWithLimit(request);
    if (!body) {
      return apiError("Invalid request body.", 400);
    }

    // Zod ile validasyon
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Validation error";
      return apiError(firstError, 400);
    }

    const { email, firstName, lastName, recaptchaToken } = parsed.data;

    // Honeypot kontrolü (boş olmalı)
    const honeypot = (body as Record<string, unknown>).honeypot;
    if (honeypot && typeof honeypot === "string" && honeypot.length > 0) {
      console.warn(`[api/subscribe] Honeypot triggered for email hash: ${hashEmail(email)}`);
      return NextResponse.json(
        { success: true, message: "Successfully subscribed!" },
        { status: 200 }
      );
    }

    // reCAPTCHA doğrulaması
    const isHuman = await validateRecaptcha(recaptchaToken);
    if (!isHuman) {
      console.warn(`[api/subscribe] reCAPTCHA failed for email hash: ${hashEmail(email)}`);
      return apiError("Bot detected. Please try again.", 403);
    }

    // Disposable email kontrolü
    const disposableCheck = checkDisposableEmail(email);
    if (disposableCheck.isDisposable) {
      console.warn(
        `[api/subscribe] Disposable email blocked: ${email} (risk: ${disposableCheck.risk})`
      );
      return apiError("Please use a permanent email address.", 400);
    }

    // --- Read API key from environment (server-side only) ---
    const apiKey = process.env.SENDER_API_KEY;

    if (!apiKey || apiKey.includes("YOUR_") || apiKey.includes("_here")) {
      console.error("[api/subscribe] SENDER_API_KEY is not configured.");
      return apiError("Server configuration error. Please try again later.", 500);
    }

    // --- Forward request to Sender.net API ---
    const senderResponse = await fetch(
      "https://api.sender.net/v2/subscribers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName || undefined,
          tags: ["kaify-waitlist"],
          groups: ["dPGkyz"],
        }),
      }
    );

    const senderData = await senderResponse.json();

    // --- Handle Sender.net response ---
    if (senderResponse.ok) {
      return NextResponse.json(
        { success: true, message: "Successfully subscribed!" },
        { status: 200 }
      );
    }

    // "Already subscribed" / "already exists" / 409 — treat as success
    const errorBody = JSON.stringify(senderData).toLowerCase();
    if (
      senderResponse.status === 409 ||
      errorBody.includes("already subscribed") ||
      errorBody.includes("already exists")
    ) {
      return NextResponse.json(
        { success: true, message: "You're already on the list!" },
        { status: 200 }
      );
    }

    // Other Sender.net errors
    console.error("[api/subscribe] Sender.net error:", senderResponse.status, senderData);
    return apiError("Failed to subscribe. Please try again later.", 502);
  } catch (error) {
    console.error("[api/subscribe] Unexpected error:", error);
    return apiError("An unexpected error occurred. Please try again.", 500);
  }
}
