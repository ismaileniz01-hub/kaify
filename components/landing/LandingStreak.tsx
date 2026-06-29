"use client";

import Image from "next/image";
import { ArrowRight, Flame } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useLang } from "@/lib/lang-context";

export function LandingStreak() {
  const { t } = useLang();
  const { ref, visible } = useScrollReveal<HTMLDivElement>({ threshold: 0.3 });

  return (
    <section id="streak" className="landing-section landing-section--streak relative overflow-hidden">
      <div className="landing-section-glow landing-section-glow--orange" aria-hidden />

      <div className="landing-container">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400/90">
            Streak
          </p>
          <h2 className="landing-section-title mt-4">
            Show up daily.{" "}
            <span className="landing-gradient-text">Watch Kai evolve.</span>
          </h2>
          <p className="mt-6 text-lg text-zinc-400">
            Consistency is the hardest part of fitness — so we made it visible.
            Your streak grows Kai from Level 1 to Level 2. You stay motivated;
            your dragon levels up with you.
          </p>
        </ScrollReveal>

        <div
          ref={ref}
          className={`landing-streak-evolution mt-12 sm:mt-16 ${visible ? "landing-streak-evolution--active" : ""}`}
        >
          <div className="landing-streak-stage focus-visible:outline-2 focus-visible:outline-purple-400 focus-visible:outline-offset-4" tabIndex={0}>
            <div className="landing-streak-badge landing-streak-badge--lv1">
              <Flame className="h-4 w-4" />
              Level 1
            </div>
            <div className="landing-streak-glow landing-streak-glow--lv1" aria-hidden />
            <Image
              src="/kai-level-1.png"
              alt="Kai — Level 1 dragon"
              width={280}
              height={280}
              className="landing-streak-kai landing-streak-kai--lv1"
            />
            <p className="mt-4 text-center text-sm font-medium text-zinc-400">
              Day 1 — Your journey begins
            </p>
          </div>

          <div className="landing-streak-bridge" aria-hidden>
            <div className="landing-streak-line" />
            <div className="landing-streak-pulse" />
            <ArrowRight className="landing-streak-arrow h-8 w-8 text-orange-400" />
            <p className="landing-streak-days">31 days</p>
          </div>

          <div className="landing-streak-stage landing-streak-stage--lv2 focus-visible:outline-2 focus-visible:outline-purple-400 focus-visible:outline-offset-4" tabIndex={0}>
            <div className="landing-streak-badge landing-streak-badge--lv2">
              <Flame className="h-4 w-4" />
              Level 2
            </div>
            <div className="landing-streak-glow landing-streak-glow--lv2" aria-hidden />
            <Image
              src="/kai-level-2.png"
              alt="Kai — Level 2 dragon"
              width={280}
              height={280}
              className="landing-streak-kai landing-streak-kai--lv2"
            />
            <p className="mt-4 text-center text-sm font-medium text-orange-300/80">
              Day 31 — Unlocked
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
