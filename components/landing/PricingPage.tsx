"use client";

import Link from "next/link";
import { Check, Minus, Sparkles, Shield, Zap, Crown } from "lucide-react";
import { LandingNav } from "./LandingNav";
import { LandingFooter } from "./LandingFooter";
import { ScrollReveal } from "./ScrollReveal";
import { FloatingOrbs } from "./FloatingOrbs";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import {
  PLAN_COMPARISON,
  PRICING_PLANS,
  formatPrice,
  type PlanId,
} from "@/lib/marketing/pricing-plans";

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="pricing-check" aria-label="Included">
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="pricing-dash" aria-label="Not included">
        <Minus className="h-4 w-4" />
      </span>
    );
  }
  return <span className="text-sm font-medium text-zinc-200">{value}</span>;
}

function PlanIcon({ id }: { id: PlanId }) {
  if (id === "premium") return <Crown className="h-5 w-5 text-amber-400" />;
  if (id === "pro") return <Zap className="h-5 w-5 text-purple-300" />;
  return <Sparkles className="h-5 w-5 text-zinc-400" />;
}

export function PricingPage() {
  return (
    <div className="landing-site">
      <LandingNav pricingPage />
      <main>
        <section className="pricing-hero relative overflow-hidden pb-8 pt-28 sm:pt-36">
          <div className="absolute inset-0">
            <FitnessWallpaper softVignette />
          </div>
          <FloatingOrbs />
          <div className="landing-hero-glow" aria-hidden />

          <div className="landing-container relative z-10">
            <ScrollReveal>
              <p className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.28em] text-purple-300/80">
                Simple pricing · Cancel anytime
              </p>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <h1 className="landing-hero-title text-center">
                Invest in a coach team
                <br />
                <span className="landing-gradient-text">that never clocks out.</span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={180}>
              <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-zinc-400">
                One subscription replaces scattered apps, guesswork, and motivation crashes.
                Pick the plan that matches your ambition — upgrade or downgrade whenever you want.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={260}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-500">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  Secure checkout
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  All plans include Kai
                </span>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="landing-section !pt-4">
          <div className="landing-container">
            <div className="pricing-cards">
              {PRICING_PLANS.map((plan, index) => (
                <ScrollReveal key={plan.id} delay={index * 120} direction="up">
                  <article
                    className={`pricing-card pricing-card--${plan.accent} ${
                      plan.popular ? "pricing-card--popular" : ""
                    }`}
                  >
                    {plan.popular && (
                      <div className="pricing-popular-badge">
                        <Zap className="h-3.5 w-3.5" />
                        Most Popular
                      </div>
                    )}

                    <div className="pricing-card-header">
                      <div className="flex items-center gap-2">
                        <PlanIcon id={plan.id} />
                        <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                      </div>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        {plan.tagline}
                      </p>
                    </div>

                    <div className="pricing-card-price">
                      <span className="pricing-amount">{formatPrice(plan.price)}</span>
                      <span className="text-sm text-zinc-500">/ month</span>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                      {plan.description}
                    </p>

                    <ul className="mt-6 flex flex-col gap-2.5">
                      {plan.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-2 text-sm text-zinc-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/login"
                      className={`landing-btn mt-8 w-full ${
                        plan.popular ? "landing-btn--primary" : "landing-btn--ghost"
                      }`}
                    >
                      {plan.popular ? "Start with Pro" : `Get ${plan.name}`}
                    </Link>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-container">
            <ScrollReveal>
              <div className="text-center">
                <h2 className="landing-section-title">Compare every plan</h2>
                <p className="mx-auto mt-4 max-w-xl text-zinc-400">
                  No hidden tiers. No surprise paywalls. What you see is what your coaching team delivers.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={120} className="mt-12">
              <div className="pricing-table-wrap">
                <table className="pricing-table">
                  <thead>
                    <tr>
                      <th scope="col">Feature</th>
                      <th scope="col">Essential</th>
                      <th scope="col" className="pricing-th-popular">
                        Pro
                        <span className="pricing-th-badge">Popular</span>
                      </th>
                      <th scope="col">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLAN_COMPARISON.map((row) => (
                      <tr
                        key={row.label}
                        className={row.highlight ? "pricing-row--highlight" : undefined}
                      >
                        <th scope="row">{row.label}</th>
                        <td>
                          <FeatureValue value={row.essential} />
                        </td>
                        <td className="pricing-td-popular">
                          <FeatureValue value={row.pro} />
                        </td>
                        <td>
                          <FeatureValue value={row.premium} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="landing-section !pb-20">
          <div className="landing-container">
            <ScrollReveal direction="scale">
              <div className="landing-cta-panel pricing-final-cta">
                <div className="landing-cta-glow" aria-hidden />
                <h2 className="text-center text-3xl font-bold text-white md:text-4xl">
                  Your future self is already thanking you.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-center text-lg text-zinc-400">
                  Join thousands building consistency with coaches who remember your goals,
                  celebrate your streaks, and never judge a bad day.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link href="/login" className="landing-btn landing-btn--primary landing-btn--lg">
                    Create free account
                  </Link>
                  <Link href="/" className="landing-btn landing-btn--ghost landing-btn--lg">
                    Back to home
                  </Link>
                </div>
                <p className="mt-6 text-center text-xs text-zinc-600">
                  Prices in USD. Billed monthly. Manage or cancel anytime in Settings.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
