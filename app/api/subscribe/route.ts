import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email } = await request.json();

    if (!firstName?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "First name and email are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.SENDER_API_KEY;

    if (!apiKey) {
      console.error("SENDER_API_KEY is not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.sender.net/v2/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName?.trim() || "",
        groups: ["waitlist"],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Sender.net API error:", response.status, errorData);
      return NextResponse.json(
        { error: "Failed to subscribe" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
