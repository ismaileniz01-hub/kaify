import type { SubscriptionTier } from "@/lib/types/database.types";

const TIER_LABELS: Record<SubscriptionTier, string> = {
  essential: "Essential",
  pro: "Pro",
  premium_max: "Premium",
};

export function formatTierLabel(tier: string): string {
  if (tier in TIER_LABELS) {
    return TIER_LABELS[tier as SubscriptionTier];
  }
  return tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
