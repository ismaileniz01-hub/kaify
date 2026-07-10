import { getPaddlePriceIdForPlan } from "@/lib/billing/paddle-config";

export type PlanId = "essential" | "pro" | "premium";
export type BillingInterval = "monthly" | "yearly";

export type ElsewhereStackItem = {
  label: string;
  priceLabel: string;
  icon: string;
};

/** What users typically pay when hiring separate coaches/tools (editable). */
export const ELSEWHERE_STACK_ITEMS: ElsewhereStackItem[] = [
  { label: "Personal Trainer", priceLabel: "$50+", icon: "🏋️" },
  { label: "Nutrition Coach", priceLabel: "$40+", icon: "🥗" },
  { label: "Calorie Tracking", priceLabel: "$10+", icon: "📊" },
  { label: "Posture Coach", priceLabel: "$40+", icon: "🧍" },
];

/** Baseline monthly stack used for savings math — update if market rates change. */
export const ELSEWHERE_MONTHLY_BASE = 140;

/** Annual billing = pay for 10 months, get 12 (2 months free). */
export const YEARLY_BILLING_MONTHS_PAID = 10;

export type PlanFeature = {
  label: string;
  essential: string | boolean;
  pro: string | boolean;
  premium: string | boolean;
  highlight?: boolean;
};

export type PricingPlan = {
  id: PlanId;
  name: string;
  /** Monthly subscription price (USD). */
  priceMonthly: number;
  /**
   * Optional override for annual total. When omitted, derived from
   * `priceMonthly * YEARLY_BILLING_MONTHS_PAID`.
   */
  priceYearlyTotal?: number;
  tagline: string;
  description: string;
  popular?: boolean;
  accent: "zinc" | "purple" | "amber";
  perks: string[];
  paddlePriceId?: string;
  paddlePriceIdYearly?: string;
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "essential",
    name: "Essential",
    priceMonthly: 14.99,
    tagline: "Start strong",
    description:
      "Build the habit with your full coaching team, real analytics, and Kai by your side.",
    accent: "zinc",
    perks: [
      "All 4 AI coaches unlocked",
      "Great Capacity coaching",
      "1 Maya meal scan / day",
      "1 Leo physique scan / week",
      "Streaks, gems & Kai",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 24.99,
    tagline: "Most chosen",
    description:
      "Train with more depth — higher capacity, more scans, priority replies, and team chat.",
    popular: true,
    accent: "purple",
    perks: [
      "Everything in Essential",
      "2.5× Capacity coaching",
      "3 Maya meal scans / day",
      "2 Leo physique scans / week",
      "Priority AI responses",
      "Team chat with coaches",
      "Advanced coach memory",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    priceMonthly: 34.99,
    tagline: "No limits mindset",
    description:
      "Maximum coaching power for athletes and ambitious builders who want every advantage.",
    accent: "amber",
    perks: [
      "Everything in Pro",
      "5× Capacity coaching",
      "5 Maya meal scans / day",
      "3 Leo physique scans / week",
      "Deepest coach memory",
      "Fastest priority responses",
      "VIP support priority",
      "Full K.AIFY experience",
    ],
  },
];

export function getYearlyTotal(plan: Pick<PricingPlan, "priceMonthly" | "priceYearlyTotal">): number {
  if (plan.priceYearlyTotal != null) return plan.priceYearlyTotal;
  return roundMoney(plan.priceMonthly * YEARLY_BILLING_MONTHS_PAID);
}

export function getYearlyMonthlyEquivalent(
  plan: Pick<PricingPlan, "priceMonthly" | "priceYearlyTotal">,
): number {
  return roundMoney(getYearlyTotal(plan) / 12);
}

export function getDisplayPrice(
  plan: Pick<PricingPlan, "priceMonthly" | "priceYearlyTotal">,
  interval: BillingInterval,
): { amount: number; suffix: string; billedNote: string } {
  if (interval === "monthly") {
    return {
      amount: plan.priceMonthly,
      suffix: "/ month",
      billedNote: "Billed monthly",
    };
  }
  const yearlyTotal = getYearlyTotal(plan);
  return {
    amount: getYearlyMonthlyEquivalent(plan),
    suffix: "/ month",
    billedNote: `${formatPrice(yearlyTotal)} billed yearly · 2 months free`,
  };
}

export type PlanSavings = {
  monthlyVsElsewhere: number;
  yearlyVsElsewhere: number;
  elsewhereMonthly: number;
  elsewhereYearly: number;
  kaifyMonthly: number;
  kaifyYearly: number;
};

export function getPlanSavings(
  plan: Pick<PricingPlan, "priceMonthly" | "priceYearlyTotal">,
): PlanSavings {
  const kaifyMonthly = plan.priceMonthly;
  const kaifyYearly = getYearlyTotal(plan);
  const elsewhereMonthly = ELSEWHERE_MONTHLY_BASE;
  const elsewhereYearly = ELSEWHERE_MONTHLY_BASE * 12;

  return {
    monthlyVsElsewhere: Math.max(0, roundMoney(elsewhereMonthly - kaifyMonthly)),
    yearlyVsElsewhere: Math.max(0, roundMoney(elsewhereYearly - kaifyYearly)),
    elsewhereMonthly,
    elsewhereYearly,
    kaifyMonthly,
    kaifyYearly,
  };
}

export function formatSavings(amount: number): string {
  const rounded = Math.floor(amount);
  return `$${rounded.toLocaleString("en-US")}+`;
}

export function resolvePlanPaddleIds(plan: PricingPlan): PricingPlan {
  const monthly = getPaddlePriceIdForPlan(plan.id, "monthly");
  const yearly = getPaddlePriceIdForPlan(plan.id, "yearly");
  return {
    ...plan,
    paddlePriceId: monthly,
    paddlePriceIdYearly: yearly,
  };
}

export const PRICING_PLANS_WITH_PADDLE: PricingPlan[] = PRICING_PLANS.map(resolvePlanPaddleIds);

export const PLAN_COMPARISON: PlanFeature[] = [
  {
    label: "Best for",
    essential: "Getting consistent",
    pro: "Training seriously",
    premium: "Going all-in",
    highlight: true,
  },
  {
    label: "AI coaching team (Alex, Maya, Leo & Kai)",
    essential: true,
    pro: true,
    premium: true,
  },
  {
    label: "Monthly coaching capacity",
    essential: "Great Capacity",
    pro: "2.5× Capacity",
    premium: "5× Capacity",
    highlight: true,
  },
  {
    label: "Maya meal photo scans",
    essential: "1 / day",
    pro: "3 / day",
    premium: "5 / day",
    highlight: true,
  },
  {
    label: "Leo physique progress scans",
    essential: "1 / week",
    pro: "2 / week",
    premium: "3 / week",
    highlight: true,
  },
  {
    label: "Smart analytics dashboard",
    essential: true,
    pro: true,
    premium: true,
  },
  {
    label: "Meal logging with coach approval",
    essential: true,
    pro: true,
    premium: true,
  },
  {
    label: "Daily streak, gems & Freezies",
    essential: true,
    pro: true,
    premium: true,
  },
  {
    label: "Kai dragon companion & evolutions",
    essential: true,
    pro: true,
    premium: true,
  },
  {
    label: "Global & country leaderboards",
    essential: true,
    pro: true,
    premium: true,
  },
  {
    label: "Push notifications & reminders",
    essential: true,
    pro: true,
    premium: true,
  },
  {
    label: "Team chat with coaches",
    essential: false,
    pro: true,
    premium: true,
    highlight: true,
  },
  {
    label: "Priority AI response speed",
    essential: false,
    pro: "Priority",
    premium: "Fastest",
    highlight: true,
  },
  {
    label: "Coach memory & conversation depth",
    essential: "Standard",
    pro: "Advanced",
    premium: "Deepest",
    highlight: true,
  },
  {
    label: "Support",
    essential: "Standard",
    pro: "Priority",
    premium: "VIP",
    highlight: true,
  },
  {
    label: "Why upgrade",
    essential: "Solid start",
    pro: "Best value",
    premium: "Maximum power",
    highlight: true,
  },
];

export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** @deprecated Use priceMonthly — kept for teaser components. */
export function planMonthlyPrice(plan: PricingPlan): number {
  return plan.priceMonthly;
}
