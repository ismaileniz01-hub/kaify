import type { Metadata } from "next";
import { PricingPage } from "@/components/landing/PricingPage";

export const metadata: Metadata = {
  title: "Pricing — K.AIFY",
  description:
    "Choose Essential, Pro, or Premium. Four AI coaches, smart analytics, and Kai your dragon companion — from $14.99/month.",
  openGraph: {
    title: "K.AIFY Pricing — Your Pro Coaching Team",
    description:
      "Essential $14.99 · Pro $24.99 · Premium $34.99. Compare plans and start your fitness journey.",
  },
};

export default function PricingRoute() {
  return <PricingPage />;
}
