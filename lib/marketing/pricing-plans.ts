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
      "Everything you need to build the habit — four expert coaches, real analytics, and Kai by your side.",
    accent: "zinc",
    perks: [
      "All 4 AI coaches unlocked",
      "1M coaching messages / month",
      "1 Maya meal scan per day",
      "1 Leo physique scan per week",
      "Streaks, gems & Kai evolution",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 24.99,
    tagline: "Most chosen",
    description:
      "For people who train seriously and want deeper guidance, more scans, and faster coach replies.",
    popular: true,
    accent: "purple",
    perks: [
      "Everything in Essential",
      "2.5M coaching messages / month",
      "3 Maya meal scans per day",
      "2 Leo physique scans per week",
      "Priority AI responses",
      "Team chat with your coaches",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 34.99,
    tagline: "No limits mindset",
    description:
      "Maximum coach depth for athletes, founders, and anyone who wants the full K.AIFY experience.",
    accent: "amber",
    perks: [
      "Everything in Pro",
      "5M coaching messages / month",
      "5 Maya meal scans per day",
      "3 Leo physique scans per week",
      "Deepest coach memory & context",
      "VIP support priority",
    ],
  },
];

export const PRICING_PLANS_WITH_PADDLE: PricingPlan[] = PRICING_PLANS.map((plan) => ({
  ...plan,
  paddlePriceId: getPaddlePriceIdForPlan(plan.id),
}));

export const PLAN_COMPARISON: PlanFeature[] = [
  {
    label: "AI coaching team (Alex, Maya, Leo & Kai)",
    essential: true,
    pro: true,
    premium: true,
  },
  {
    label: "Monthly AI coaching capacity",
    essential: "1M tokens",
    pro: "2.5M tokens",
    premium: "5M tokens",
    highlight: true,
  },
  {
    label: "Maya food photo analysis",
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
    label: "Team chat with coaches",
    essential: false,
    pro: true,
    premium: true,
  },
  {
    label: "Coach memory & conversation context",
    essential: "Standard",
    pro: "Advanced",
    premium: "Premium",
  },
  {
    label: "Priority AI response speed",
    essential: false,
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
    label: "Support",
    essential: "Standard",
    pro: "Priority",
    premium: "VIP",
  },
];

export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
