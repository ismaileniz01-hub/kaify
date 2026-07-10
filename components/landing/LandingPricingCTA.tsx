"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { PRICING_PLANS, formatPrice } from "@/lib/marketing/pricing-plans";
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
        <ScrollReveal>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-300/80">
              {t("landing.pricing.eyebrow")}
            </p>
            <h2 className="landing-section-title mt-4">{t("landing.pricing.title")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
              {t("landing.pricing.subtitle")}
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {PRICING_PLANS.map((plan, i) => (
            <ScrollReveal key={plan.id} delay={i * 100} direction="up">
              <div
                className={`pricing-teaser ${plan.popular ? "pricing-teaser--popular" : ""}`}
              >
                {plan.popular && (
                  <span className="pricing-teaser-badge">
                    <Sparkles className="h-3 w-3" />
                    {t("landing.pricing.most_popular")}
                  </span>
                )}
                <p className="text-sm font-semibold text-zinc-400">{plan.name}</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {formatPrice(plan.priceMonthly)}
                  <span className="text-sm font-normal text-zinc-500">/mo</span>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">{plan.tagline}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={200} direction="scale">
          <div className="landing-cta-panel mt-12">
            <div className="landing-cta-glow" aria-hidden />

            <Image
              src="/kaify-logo.png"
              alt="K.AIFY"
              width={72}
              height={72}
              className="mx-auto h-[72px] w-[72px] rounded-2xl object-cover shadow-[0_0_48px_rgba(168,85,247,0.5)]"
            />

            <h3 className="mt-6 text-center text-2xl font-bold text-white md:text-3xl">
              {t("landing.pricing.cta_title")}
            </h3>
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

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/pricing"
                className="landing-btn landing-btn--primary landing-btn--lg group inline-flex gap-2"
              >
                {t("landing.pricing.explore_plans")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/login?mode=signup" className="landing-btn landing-btn--ghost landing-btn--lg">
                {t("landing.nav.login")}
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
