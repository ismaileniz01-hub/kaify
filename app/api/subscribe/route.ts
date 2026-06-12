import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/subscribe
 *
 * Receives waitlist signup data from the client, validates it,
 * and forwards it to the Sender.net API server-side.
 *
 * The SENDER_API_KEY environment variable is never exposed to the browser.
 */
export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    // --- Normalize name fields (use fallback if empty) ---
    const safeFirstName =
      firstName && typeof firstName === "string" && firstName.trim()
        ? firstName.trim()
        : "Unknown";

    const safeLastName =
      lastName && typeof lastName === "string" && lastName.trim()
        ? lastName.trim()
        : undefined;

    // --- Read API key from environment (server-side only) ---
    const apiKey = process.env.SENDER_API_KEY;

    if (!apiKey) {
      console.error("[api/subscribe] SENDER_API_KEY is not set in environment.");
      return NextResponse.json(
        { error: "Server configuration error. Please try again later." },
        { status: 500 }
      );
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
          email: email.trim(),
          first_name: safeFirstName,
          last_name: safeLastName,
          tags: ["kaify-waitlist"],
          groups: ["dJ1MpD"],
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
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again later." },
      { status: 502 }
    );
  } catch (error) {
    // Network failure or JSON parse error
    console.error("[api/subscribe] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
