import type { PlanId, BillingInterval } from "@/lib/marketing/pricing-plans";
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

const PLAN_PRICE_ENV_MONTHLY: Record<PlanId, string> = {
  essential: "NEXT_PUBLIC_PADDLE_PRICE_ESSENTIAL",
  pro: "NEXT_PUBLIC_PADDLE_PRICE_PRO",
  premium: "NEXT_PUBLIC_PADDLE_PRICE_PREMIUM",
};

const PLAN_PRICE_ENV_YEARLY: Record<PlanId, string> = {
  essential: "NEXT_PUBLIC_PADDLE_PRICE_ESSENTIAL_YEARLY",
  pro: "NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY",
  premium: "NEXT_PUBLIC_PADDLE_PRICE_PREMIUM_YEARLY",
};

/** Paddle price ID for checkout buttons (client). */
export function getPaddlePriceIdForPlan(
  planId: PlanId,
  interval: BillingInterval = "monthly",
): string | undefined {
  const key =
    interval === "yearly" ? PLAN_PRICE_ENV_YEARLY[planId] : PLAN_PRICE_ENV_MONTHLY[planId];
  const value = process.env[key]?.trim();
  return value || undefined;
}

const SERVER_PRICE_TIER_MONTHLY: [string | undefined, SubscriptionTier][] = [
  [process.env.PADDLE_PRICE_ESSENTIAL, "essential"],
  [process.env.PADDLE_PRICE_PRO, "pro"],
  [process.env.PADDLE_PRICE_PREMIUM_MAX, "premium_max"],
];

const SERVER_PRICE_TIER_YEARLY: [string | undefined, SubscriptionTier][] = [
  [process.env.PADDLE_PRICE_ESSENTIAL_YEARLY, "essential"],
  [process.env.PADDLE_PRICE_PRO_YEARLY, "pro"],
  [process.env.PADDLE_PRICE_PREMIUM_MAX_YEARLY, "premium_max"],
];

function mergePriceTierMap(
  pairs: [string | undefined, SubscriptionTier][],
): Record<string, SubscriptionTier> {
  const map: Record<string, SubscriptionTier> = {};
  for (const [priceId, tier] of pairs) {
    if (priceId?.trim()) map[priceId.trim()] = tier;
  }
  return map;
}

/** Maps Paddle price IDs → subscription tier (webhook). */
export function buildPaddlePriceTierMap(): Record<string, SubscriptionTier> {
  return {
    ...mergePriceTierMap(SERVER_PRICE_TIER_MONTHLY),
    ...mergePriceTierMap(SERVER_PRICE_TIER_YEARLY),
  };
}
