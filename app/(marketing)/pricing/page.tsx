import { PricingPage } from "@/components/landing/PricingPage";
import { PaddleProvider } from "@/components/billing/PaddleProvider";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata({
  title: "Pricing — Kaify Ai",
  description:
    "Choose Essential, Pro, or Premium. Four AI coaches and Kai from $14.99/month.",
  path: "/pricing",
});

/** Public indexable pricing — static HTML so SEO tags sit in the first head. */
export default function PricingRoute() {
  return (
    <PaddleProvider>
      <PricingPage />
    </PaddleProvider>
  );
}
