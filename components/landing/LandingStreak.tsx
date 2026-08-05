"use client";

import Image from "next/image";
import { ArrowRight, Flame } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useLang } from "@/lib/lang-context";

export function LandingStreak() {
  const { ref, visible } = useScrollReveal<HTMLDivElement>({ threshold: 0.3 });
  const { t } = useLang();

  return (
    <section id="streak" className="landing-section landing-section--streak relative overflow-hidden">
      <div className="landing-section-glow landing-section-glow--orange" aria-hidden />

      <div className="landing-container">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400/90">
            {t("landing.streak.eyebrow")}
          </p>
          <h2 className="landing-section-title mt-4">
            {t("landing.streak.headline")}{" "}
            <span className="landing-gradient-text">
              {t("landing.streak.headline_accent")}
            </span>
          </h2>
          <p className="mt-6 text-lg text-zinc-400">
            {t("landing.streak.description")}
          </p>
        </ScrollReveal>

        <div
          ref={ref}
          className={`landing-streak-evolution mt-12 sm:mt-16 ${visible ? "landing-streak-evolution--active" : ""}`}
        >
          <div className="landing-streak-stage focus-visible:outline-2 focus-visible:outline-purple-400 focus-visible:outline-offset-4" tabIndex={0}>
            <div className="landing-streak-badge landing-streak-badge--lv1">
              <Flame className="h-4 w-4" />
              {t("landing.streak.level", { level: 1 })}
            </div>
            <div className="landing-streak-glow landing-streak-glow--lv1" aria-hidden />
            <Image
              src="/avatars/kai-level-1.webp"
              alt={t("landing.streak.kai_alt", { level: 1 })}
              width={280}
              height={280}
              className="landing-streak-kai landing-streak-kai--lv1"
            />
            <p className="mt-4 text-center text-sm font-medium text-zinc-400">
              {t("landing.streak.day_start")}
            </p>
          </div>

          <div className="landing-streak-bridge" aria-hidden>
            <div className="landing-streak-line" />
            <div className="landing-streak-pulse" />
            <ArrowRight className="landing-streak-arrow h-8 w-8 text-orange-400" />
            <p className="landing-streak-days">
              {t("landing.streak.days", { count: 31 })}
            </p>
          </div>

          <div className="landing-streak-stage landing-streak-stage--lv2 focus-visible:outline-2 focus-visible:outline-purple-400 focus-visible:outline-offset-4" tabIndex={0}>
            <div className="landing-streak-badge landing-streak-badge--lv2">
              <Flame className="h-4 w-4" />
              {t("landing.streak.level", { level: 2 })}
            </div>
            <div className="landing-streak-glow landing-streak-glow--lv2" aria-hidden />
            <Image
              src="/avatars/kai-level-2.webp"
              alt={t("landing.streak.kai_alt", { level: 2 })}
              width={280}
              height={280}
              className="landing-streak-kai landing-streak-kai--lv2"
            />
            <p className="mt-4 text-center text-sm font-medium text-orange-300/80">
              {t("landing.streak.day_unlocked")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
