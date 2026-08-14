import type { Metadata } from "next";
import { PricingPage } from "@/components/landing/PricingPage";
import { PaddleProvider } from "@/components/billing/PaddleProvider";

export const metadata: Metadata = {
  title: "Pricing — K.AIFY",
  description:
    "Choose Essential, Pro, or Premium. Four AI coaches and Kai from $14.99/month.",
  openGraph: {
    title: "K.AIFY Pricing — Your Pro Coaching Team",
    description: "Compare plans and download K.AIFY free.",
  },
};

export default function PricingRoute() {
  return (
    <PaddleProvider>
      <PricingPage />
    </PaddleProvider>
  );
}
