import { LandingPage } from "@/components/landing/LandingPage";
import { MarketingJsonLd } from "@/components/seo/MarketingJsonLd";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata({
  title: "Kaify Ai — Your Personal Coach Team",
  description:
    "Four expert coaches, smart analytics, and Kai your dragon companion. Plans from $14.99/month.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <MarketingJsonLd />
      <LandingPage />
    </>
  );
}
