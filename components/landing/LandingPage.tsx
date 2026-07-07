"use client";

import { LandingNav } from "./LandingNav";
import { LandingHero } from "./LandingHero";
import { LandingAbout } from "./LandingAbout";
import { LandingCoaches } from "./LandingCoaches";
import { LandingFeatures } from "./LandingFeatures";
import { LandingStreak } from "./LandingStreak";
import { LandingLeaderboard } from "./LandingLeaderboard";
import { LandingPricingCTA } from "./LandingPricingCTA";
import { LandingFooter } from "./LandingFooter";
import { useLang } from "@/lib/lang-context";

export function LandingPage() {
  const { t } = useLang();
  return (
    <div className="landing-site">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingAbout />
        <LandingCoaches />
        <LandingFeatures />
        <LandingStreak />
        <LandingLeaderboard />
        <LandingPricingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
