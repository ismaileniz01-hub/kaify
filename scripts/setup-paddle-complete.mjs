#!/usr/bin/env node
/**
 * Full Paddle setup: client token + webhook + Vercel env.
 * Requires PADDLE_API_KEY with client_token.write + notification_settings.write.
 *
 * Usage:
 *   PADDLE_API_KEY=pdl_live_apikey_... node scripts/setup-paddle-complete.mjs
 */
import { spawnSync } from "node:child_process";

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

async function paddleFetch(path, init = {}) {
  const res = await fetch(`https://api.paddle.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

function upsertVercelEnv(name, value, environment) {
  spawnSync("npx", ["vercel", "env", "rm", name, environment, "--yes"], {
    stdio: "ignore",
    shell: true,
  });
  const add = spawnSync("npx", ["vercel", "env", "add", name, environment], {
    input: value,
    encoding: "utf8",
    shell: true,
  });
  if (add.status !== 0) {
    throw new Error(`Vercel env failed: ${name} (${environment})`);
  }
  console.log(`✓ Vercel ${name} → ${environment}`);
}

async function getOrCreateClientToken() {
  const list = await paddleFetch("/client-tokens");
  const tokens = list.data ?? [];
  const active = tokens.find((t) => t.status === "active" && t.token);
  if (active?.token) {
    console.log("Using existing client token:", active.name);
    return active.token;
  }

  const created = await paddleFetch("/client-tokens", {
    method: "POST",
    body: JSON.stringify({
      name: "Kaify pricing checkout",
      description: "Pricing page Paddle.js checkout on kaifyai.org",
    }),
  });
  const token = created.data?.token;
  if (!token) throw new Error("No client token in Paddle response");
  console.log("Created new client token");
  return token;
}

async function getOrCreateWebhook() {
  const list = await paddleFetch("/notification-settings");
  const settings = list.data ?? [];
  const existing = settings.find(
    (s) => s.type === "url" && s.destination === WEBHOOK_URL && s.active,
  );
  if (existing?.endpoint_secret_key) {
    console.log("Using existing webhook:", existing.id);
    return existing.endpoint_secret_key;
  }

  const created = await paddleFetch("/notification-settings", {
    method: "POST",
    body: JSON.stringify({
      description: "Kaify production billing webhook",
      type: "url",
      destination: WEBHOOK_URL,
      subscribed_events: EVENTS,
      active: true,
    }),
  });
  const secret = created.data?.endpoint_secret_key;
  if (!secret) throw new Error("No endpoint_secret_key in Paddle response");
  console.log("Created webhook:", created.data?.id);
  return secret;
}

const clientToken = await getOrCreateClientToken();
const webhookSecret = await getOrCreateWebhook();

for (const env of ["production", "preview", "development"]) {
  upsertVercelEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", clientToken, env);
  upsertVercelEnv("PADDLE_NOTIFICATION_WEBHOOK_SECRET", webhookSecret, env);
}

console.log("\nPaddle setup complete.");
console.log("Client token prefix:", clientToken.slice(0, 12) + "...");
console.log("Webhook URL:", WEBHOOK_URL);
