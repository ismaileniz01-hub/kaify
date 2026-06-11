"use client";

import { LandingNav } from "./LandingNav";
import { LandingHero } from "./LandingHero";
import { LandingAbout } from "./LandingAbout";
import { LandingCoaches } from "./LandingCoaches";
import { LandingFeatures } from "./LandingFeatures";
import { LandingStreak } from "./LandingStreak";
import { LandingKai } from "./LandingKai";
import { LandingCTA } from "./LandingCTA";
import { LandingFooter } from "./LandingFooter";

export function LandingPage() {
  return (
    <div className="landing-site">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingAbout />
        <LandingCoaches />
        <LandingFeatures />
        <LandingStreak />
        <LandingKai />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
