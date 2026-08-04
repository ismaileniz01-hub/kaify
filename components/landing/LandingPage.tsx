"use client";

import dynamic from "next/dynamic";
import { LandingNav } from "./LandingNav";
import { LandingHero } from "./LandingHero";
import { LandingAbout } from "./LandingAbout";
import { LandingFooter } from "./LandingFooter";

const LandingCoaches = dynamic(
  () => import("./LandingCoaches").then((m) => m.LandingCoaches),
  { ssr: true },
);
const LandingFeatures = dynamic(
  () => import("./LandingFeatures").then((m) => m.LandingFeatures),
  { ssr: true },
);
const LandingStreak = dynamic(
  () => import("./LandingStreak").then((m) => m.LandingStreak),
  { ssr: true },
);
const LandingLeaderboard = dynamic(
  () => import("./LandingLeaderboard").then((m) => m.LandingLeaderboard),
  { ssr: true },
);
const LandingPricingCTA = dynamic(
  () => import("./LandingPricingCTA").then((m) => m.LandingPricingCTA),
  { ssr: true },
);

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
        <LandingLeaderboard />
        <LandingPricingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
