"use client";

import { LandingNav } from "./LandingNav";
import { LandingHero } from "./LandingHero";
import { LandingAbout } from "./LandingAbout";
import { LandingCoaches } from "./LandingCoaches";
import { LandingFeatures } from "./LandingFeatures";
import { LandingStreak } from "./LandingStreak";
import { LandingLeaderboard } from "./LandingLeaderboard";
import { LandingCTA } from "./LandingCTA";
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
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
