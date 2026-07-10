#!/usr/bin/env node
/**
 * Create Paddle notification destination (webhook) and print secrets.
 * Requires PADDLE_API_KEY (live) in env.
 *
 * Usage:
 *   PADDLE_API_KEY=pdl_live_apikey_... node scripts/setup-paddle-webhook.mjs
 */
const API_KEY = process.env.PADDLE_API_KEY?.trim();
const WEBHOOK_URL =
  process.env.PADDLE_WEBHOOK_URL?.trim() || "https://kaifyai.org/api/webhooks/paddle";

const EVENTS = [
  "subscription.created",
  "subscription.updated",
  "subscription.activated",
  "subscription.resumed",
  "subscription.canceled",
  "subscription.cancelled",
];

if (!API_KEY) {
  console.error("Missing PADDLE_API_KEY");
  process.exit(1);
}

const body = {
  description: "Kaify production billing webhook",
  type: "url",
  destination: WEBHOOK_URL,
  subscribed_events: EVENTS,
  active: true,
};

const res = await fetch("https://api.paddle.com/notification-settings", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const json = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error("Paddle API error:", res.status, JSON.stringify(json, null, 2));
  process.exit(1);
}

const data = json.data ?? json;
const secret = data.endpoint_secret_key;
const id = data.id;

console.log("Webhook created:");
console.log("  id:", id);
console.log("  destination:", data.destination);
if (secret) {
  console.log("\nPADDLE_NOTIFICATION_WEBHOOK_SECRET=");
  console.log(secret);
} else {
  console.log("\nNo endpoint_secret_key in response — fetch from Paddle dashboard.");
}
