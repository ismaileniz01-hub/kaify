import type { PlanId, BillingInterval } from "@/lib/marketing/pricing-plans";
import type { SubscriptionTier } from "@/lib/types/database.types";

export type PaddleEnvironment = "sandbox" | "production";

/** Production Paddle price IDs (env overrides when set). */
export const PADDLE_PRICE_IDS = {
  essential: {
    monthly: "pri_01kx5zdq1h5gqx7haw1zx8d1sm",
    yearly: "pri_01kx5zj0y4st5vhvrz59zm6e13",
  },
  pro: {
    monthly: "pri_01kx5zwffccfx1prqtj0b7r3t9",
    yearly: "pri_01kx601q2zpzgqnmt36647dkm9",
  },
  premium_max: {
    monthly: "pri_01kx604fmcrrrk0n1wyqgg001g",
    yearly: "pri_01kx605e406052t6nbzztgz1dv",
  },
} as const;

function envOrDefault(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

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

const PLAN_DEFAULT_MONTHLY: Record<PlanId, string> = {
  essential: PADDLE_PRICE_IDS.essential.monthly,
  pro: PADDLE_PRICE_IDS.pro.monthly,
  premium: PADDLE_PRICE_IDS.premium_max.monthly,
};

const PLAN_DEFAULT_YEARLY: Record<PlanId, string> = {
  essential: PADDLE_PRICE_IDS.essential.yearly,
  pro: PADDLE_PRICE_IDS.pro.yearly,
  premium: PADDLE_PRICE_IDS.premium_max.yearly,
};

/** Paddle price ID for checkout buttons (client). */
export function getPaddlePriceIdForPlan(
  planId: PlanId,
  interval: BillingInterval = "monthly",
): string | undefined {
  if (interval === "yearly") {
    return envOrDefault(PLAN_PRICE_ENV_YEARLY[planId], PLAN_DEFAULT_YEARLY[planId]);
  }
  return envOrDefault(PLAN_PRICE_ENV_MONTHLY[planId], PLAN_DEFAULT_MONTHLY[planId]);
}

const SERVER_PRICE_TIER_MONTHLY: [string, SubscriptionTier][] = [
  [envOrDefault("PADDLE_PRICE_ESSENTIAL", PADDLE_PRICE_IDS.essential.monthly), "essential"],
  [envOrDefault("PADDLE_PRICE_PRO", PADDLE_PRICE_IDS.pro.monthly), "pro"],
  [
    envOrDefault("PADDLE_PRICE_PREMIUM_MAX", PADDLE_PRICE_IDS.premium_max.monthly),
    "premium_max",
  ],
];

const SERVER_PRICE_TIER_YEARLY: [string, SubscriptionTier][] = [
  [envOrDefault("PADDLE_PRICE_ESSENTIAL_YEARLY", PADDLE_PRICE_IDS.essential.yearly), "essential"],
  [envOrDefault("PADDLE_PRICE_PRO_YEARLY", PADDLE_PRICE_IDS.pro.yearly), "pro"],
  [
    envOrDefault("PADDLE_PRICE_PREMIUM_MAX_YEARLY", PADDLE_PRICE_IDS.premium_max.yearly),
    "premium_max",
  ],
];

function mergePriceTierMap(
  pairs: [string, SubscriptionTier][],
): Record<string, SubscriptionTier> {
  const map: Record<string, SubscriptionTier> = {};
  for (const [priceId, tier] of pairs) {
    if (priceId.trim()) map[priceId.trim()] = tier;
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

/** Maps Paddle price IDs → billing cycle (webhook expiry / apply_subscription). */
export function buildPaddlePriceCycleMap(): Record<string, "monthly" | "yearly"> {
  const map: Record<string, "monthly" | "yearly"> = {};
  for (const [priceId] of SERVER_PRICE_TIER_MONTHLY) {
    if (priceId.trim()) map[priceId.trim()] = "monthly";
  }
  for (const [priceId] of SERVER_PRICE_TIER_YEARLY) {
    if (priceId.trim()) map[priceId.trim()] = "yearly";
  }
  return map;
}
