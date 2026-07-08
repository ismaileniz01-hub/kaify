import type { Metadata } from "next";
import { PricingPage } from "@/components/landing/PricingPage";
import { PaddleProvider } from "@/components/billing/PaddleProvider";

export const metadata: Metadata = {
  title: "Pricing — K.AIFY",
  description:
    "Choose Essential, Pro, or Premium. Great Capacity, 2.5×, or 5× coaching — four AI coaches and Kai from $14.99/month.",
  openGraph: {
    title: "K.AIFY Pricing — Your Pro Coaching Team",
    description:
      "Essential $14.99 · Pro $24.99 · Premium $34.99. Compare the ladder and download K.AIFY free.",
  },
};

export default function PricingRoute() {
  return (
    <PaddleProvider>
      <PricingPage />
    </PaddleProvider>
  );
}
