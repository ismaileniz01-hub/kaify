"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { useLang } from "@/lib/lang-context";

export function LandingPricingCTA() {
  const { t } = useLang();

  return (
    <section id="pricing" className="landing-section relative">
      <div
        className="landing-section-glow landing-section-glow--purple"
        style={{ top: "10%", left: "50%", transform: "translateX(-50%)" }}
        aria-hidden
      />
      <div className="landing-container">
        <ScrollReveal direction="scale">
          <div className="landing-cta-panel">
            <div className="landing-cta-glow" aria-hidden />

            <Image
              src="/kaify-logo.png"
              alt="Kaify Ai"
              width={72}
              height={72}
              className="mx-auto h-[72px] w-[72px] rounded-2xl object-cover shadow-[0_0_48px_rgba(168,85,247,0.5)]"
            />

            <h2 className="mt-6 text-center text-2xl font-bold text-white md:text-3xl">
              {t("landing.pricing.cta_title")}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-zinc-400">
              {t("landing.pricing.cta_subtitle")}
            </p>

            <ul className="mx-auto mt-8 flex max-w-md flex-col gap-3">
              {[
                t("landing.pricing.bullet1"),
                t("landing.pricing.bullet2"),
                t("landing.pricing.bullet3"),
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/pricing"
                className="landing-btn landing-btn--primary landing-btn--lg group inline-flex w-full justify-center gap-2 sm:w-auto"
              >
                {t("landing.pricing.explore_plans")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </Link>
              <Link href="/signup" className="landing-btn landing-btn--ghost landing-btn--lg w-full justify-center sm:w-auto">
                {t("landing.nav.login")}
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
