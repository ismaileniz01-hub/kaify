import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  // Sadece POST isteklerine izin ver
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { email, name } = JSON.parse(event.body || "{}");

    if (!email || !name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Email and name are required" }),
      };
    }

    const apiKey = process.env.SENDER_API_KEY;

    if (!apiKey) {
      console.error("❌ SENDER_API_KEY environment variable is not set");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    console.log("📤 Sender.net API'ye istek gönderiliyor...");
    console.log("  → Email:", email);
    console.log("  → Name:", name);

    const response = await fetch("https://api.sender.net/v2/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email: email,
        first_name: name,
        tags: ["kaify-waitlist"],
        groups: ["dJ1MpD"],
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Sender.net API başarılı:", data);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: "You're on the list!" }),
      };
    }

    // E-posta zaten kayıtlı mı kontrol et
    const errorMessage = JSON.stringify(data).toLowerCase();
    if (
      errorMessage.includes("already subscribed") ||
      errorMessage.includes("already exists") ||
      errorMessage.includes("already registered") ||
      errorMessage.includes("duplicate") ||
      response.status === 409
    ) {
      console.log("ℹ️ E-posta zaten kayıtlı:", email);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: "Zaten kayıtlısınız, ilginiz için teşekkürler!" }),
      };
    }

    console.error("❌ Sender.net API hatası:", response.status, data);
    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify({ error: "Failed to subscribe" }),
    };
  } catch (err) {
    console.error("❌ Sender.net API isteği başarısız:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
