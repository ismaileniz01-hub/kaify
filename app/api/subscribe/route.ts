import { NextRequest, NextResponse } from "next/server";
import { allowMethods, sanitizeInput, isValidEmail, apiError } from "@/lib/api-security";

/**
 * POST /api/subscribe
 *
 * Receives waitlist signup data from the client, validates it,
 * and forwards it to the Sender.net API server-side.
 *
 * The SENDER_API_KEY environment variable is never exposed to the browser.
 */
export async function POST(request: NextRequest) {
  // Method kontrolü
  const methodCheck = allowMethods(request, ["POST"]);
  if (methodCheck) return methodCheck;

  try {
    // --- Parse request body ---
    const body = await request.json();
    const { email, firstName, lastName } = body as {
      email?: string;
      firstName?: string;
      lastName?: string;
    };

    // --- Validate required fields ---
    if (!email || typeof email !== "string" || !email.trim()) {
      return apiError("Email is required.", 400);
    }

    // Email format validation
    const cleanEmail = sanitizeInput(email.trim());
    if (!isValidEmail(cleanEmail)) {
      return apiError("Invalid email format.", 400);
    }

    // --- Normalize name fields (use fallback if empty) ---
    const safeFirstName =
      firstName && typeof firstName === "string" && firstName.trim()
        ? sanitizeInput(firstName.trim())
        : "Unknown";

    const safeLastName =
      lastName && typeof lastName === "string" && lastName.trim()
        ? sanitizeInput(lastName.trim())
        : undefined;

    // --- Read API key from environment (server-side only) ---
    const apiKey = process.env.SENDER_API_KEY;

    if (!apiKey) {
      console.error("[api/subscribe] SENDER_API_KEY is not set in environment.");
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
          email: cleanEmail,
          first_name: safeFirstName,
          last_name: safeLastName,
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
    // Network failure or JSON parse error
    console.error("[api/subscribe] Unexpected error:", error);
    return apiError("An unexpected error occurred. Please try again.", 500);
  }
}
