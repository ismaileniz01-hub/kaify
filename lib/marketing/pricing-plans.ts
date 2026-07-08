import { getPaddlePriceIdForPlan } from "@/lib/billing/paddle-config";

export type PlanId = "essential" | "pro" | "premium";

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
  price: number;
  tagline: string;
  description: string;
  popular?: boolean;
  accent: "zinc" | "purple" | "amber";
  perks: string[];
  paddlePriceId?: string;
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "essential",
    name: "Essential",
    price: 14.99,
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
    price: 24.99,
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
    price: 34.99,
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

export const PRICING_PLANS_WITH_PADDLE: PricingPlan[] = PRICING_PLANS.map((plan) => ({
  ...plan,
  paddlePriceId: getPaddlePriceIdForPlan(plan.id),
}));

/**
 * Ladder-style comparison: each step clearly outgrows the one before it.
 * Ordered so shared foundations sit first, then escalating differentiators.
 */
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
