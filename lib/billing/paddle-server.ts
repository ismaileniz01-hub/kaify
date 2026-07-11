import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { getPaddleEnvironment } from "@/lib/billing/paddle-config";

let cached: Paddle | null = null;

/** Server-side Paddle Billing client (API key — never expose to the browser). */
export function getPaddleApiKey(): string {
  return process.env.PADDLE_API_KEY?.trim() ?? "";
}

export function isPaddleServerConfigured(): boolean {
  return Boolean(getPaddleApiKey());
}

export function getPaddleServerClient(): Paddle {
  const apiKey = getPaddleApiKey();
  if (!apiKey) {
    throw new Error("PADDLE_API_KEY is not configured");
  }
  if (!cached) {
    cached = new Paddle(apiKey, {
      environment:
        getPaddleEnvironment() === "production"
          ? Environment.production
          : Environment.sandbox,
    });
  }
  return cached;
}

export function getPaddleWebhookSecret(): string {
  return process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET?.trim() ?? "";
}
