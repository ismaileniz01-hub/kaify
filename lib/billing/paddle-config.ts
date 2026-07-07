import type { PlanId } from "@/lib/marketing/pricing-plans";
import type { SubscriptionTier } from "@/lib/types/database.types";

export type PaddleEnvironment = "sandbox" | "production";

/** Client-side Paddle.js token (safe to expose). */
export function getPaddleClientToken(): string {
  return process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? "";
}

export function getPaddleEnvironment(): PaddleEnvironment {
  return process.env.NEXT_PUBLIC_PADDLE_ENV?.trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

export function isPaddleConfigured(): boolean {
  return Boolean(getPaddleClientToken());
}

const PLAN_PRICE_ENV: Record<PlanId, string> = {
  essential: "NEXT_PUBLIC_PADDLE_PRICE_ESSENTIAL",
  pro: "NEXT_PUBLIC_PADDLE_PRICE_PRO",
  premium: "NEXT_PUBLIC_PADDLE_PRICE_PREMIUM",
};

/** Paddle price ID for checkout buttons (client). */
export function getPaddlePriceIdForPlan(planId: PlanId): string | undefined {
  const key = PLAN_PRICE_ENV[planId];
  const value = process.env[key]?.trim();
  return value || undefined;
}

const SERVER_PRICE_TIER: [string | undefined, SubscriptionTier][] = [
  [process.env.PADDLE_PRICE_ESSENTIAL, "essential"],
  [process.env.PADDLE_PRICE_PRO, "pro"],
  [process.env.PADDLE_PRICE_PREMIUM_MAX, "premium_max"],
];

/** Maps Paddle price IDs → subscription tier (webhook). */
export function buildPaddlePriceTierMap(): Record<string, SubscriptionTier> {
  const map: Record<string, SubscriptionTier> = {};
  for (const [priceId, tier] of SERVER_PRICE_TIER) {
    if (priceId?.trim()) map[priceId.trim()] = tier;
  }
  return map;
}
