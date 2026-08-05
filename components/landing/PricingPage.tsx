"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Minus, Sparkles, Shield, Zap, Crown } from "lucide-react";
import { LandingNav } from "./LandingNav";
import { LandingFooter } from "./LandingFooter";
import { ScrollReveal } from "./ScrollReveal";
import { FloatingOrbs } from "./FloatingOrbs";
import { StoreDownloadButtons } from "./StoreDownloadButtons";
import { PlanSavingsCard } from "./PlanSavingsCard";
import { PricingBillingToggle } from "./PricingBillingToggle";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { usePaddle } from "@/components/billing/PaddleProvider";
import { useSession } from "@/lib/session-context";
import { useNativeApp } from "@/lib/native/platform";
import { NATIVE_CHECKOUT_RETURN_URL } from "@/lib/billing/native-web-checkout";
import { useLang } from "@/lib/lang-context";
import {
  PLAN_COMPARISON,
  PRICING_PLANS_WITH_PADDLE,
  formatPrice,
  getDisplayPrice,
  type BillingInterval,
  type PlanId,
  type PricingPlan,
} from "@/lib/marketing/pricing-plans";

function FeatureValue({
  value,
  emphasize,
  includedLabel,
  excludedLabel,
}: {
  value: string | boolean;
  emphasize?: boolean;
  includedLabel: string;
  excludedLabel: string;
}) {
  if (value === true) {
    return (
      <span className="pricing-check" aria-label={includedLabel}>
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="pricing-dash" aria-label={excludedLabel}>
        <Minus className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span
      className={`text-sm font-medium ${
        emphasize ? "text-white" : "text-zinc-200"
      }`}
    >
      {value}
    </span>
  );
}

function PlanIcon({ id }: { id: PlanId }) {
  if (id === "premium") return <Crown className="h-5 w-5 text-amber-400" />;
  if (id === "pro") return <Zap className="h-5 w-5 text-purple-300" />;
  return <Sparkles className="h-5 w-5 text-zinc-400" />;
}

function PaddleCheckoutResume() {
  const searchParams = useSearchParams();
  const { paddle, ready } = usePaddle();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { shouldOpenPaddleCheckoutInApp } = await import(
        "@/lib/billing/native-web-checkout"
      );
      if (cancelled || !(await shouldOpenPaddleCheckoutInApp())) return;
      if (!ready || !paddle) return;
      const txn =
        searchParams.get("_ptxn") ??
        searchParams.get("transaction_id") ??
        searchParams.get("transactionId");
      if (txn) {
        paddle.Checkout.open({ transactionId: txn });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paddle, ready, searchParams]);

  return null;
}

function WebCheckoutReturn() {
  const { checkoutCompleted } = usePaddle();
  const { t } = useLang();
  if (!checkoutCompleted) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 top-6 z-[10000] mx-auto max-w-md rounded-2xl border border-emerald-400/30 bg-zinc-950/95 p-5 text-center backdrop-blur-xl"
    >
      <p className="text-base font-semibold text-white">
        {t("pricing.checkout.activated")}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-300">
        {t("pricing.checkout.return_hint")}
      </p>
      <a
        href={NATIVE_CHECKOUT_RETURN_URL}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-bold text-zinc-950 transition hover:bg-emerald-400"
      >
        {t("pricing.checkout.open_app")}
      </a>
    </div>
  );
}

function PlanCheckoutButton({
  plan,
  interval,
  className,
  children,
}: {
  plan: PricingPlan;
  interval: BillingInterval;
  className: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { paddle, ready, configured } = usePaddle();
  const { isAuthenticated, profile } = useSession();
  const native = useNativeApp();
  const { t } = useLang();

  const handleClick = useCallback(() => {
    void (async () => {
      const { shouldOpenPaddleCheckoutInApp } = await import(
        "@/lib/billing/native-web-checkout"
      );
      if (!(await shouldOpenPaddleCheckoutInApp())) {
        return;
      }
      const priceId =
        interval === "yearly" ? plan.paddlePriceIdYearly : plan.paddlePriceId;
      if (!isAuthenticated || !profile?.id) {
        router.push("/signup?next=/pricing");
        return;
      }
      if (configured && ready && paddle && priceId) {
        paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customData: { user_id: profile.id },
          settings: {
            showAddDiscounts: true,
          },
        });
      }
    })();
  }, [
    configured,
    interval,
    isAuthenticated,
    paddle,
    plan.paddlePriceId,
    plan.paddlePriceIdYearly,
    profile?.id,
    ready,
    router,
  ]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={native !== false}
      className={className}
    >
      {native ? t("pricing.available_on_web") : children}
    </button>
  );
}

export function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const native = useNativeApp();
  const { lang, t } = useLang();

  // Defense in depth: NativeAppEntry redirects this route to /login. Until
  // native detection completes, never paint prices or an external purchase CTA.
  if (native !== false) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-purple-400" />
      </div>
    );
  }

  return (
    <div className="landing-site">
      <WebCheckoutReturn />
      <Suspense fallback={null}>
        <PaddleCheckoutResume />
      </Suspense>
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
                {t("pricing.hero.eyebrow")}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <h1 className="landing-hero-title text-center">
                {t("pricing.hero.title")}
                <br />
                <span className="landing-gradient-text">
                  {t("pricing.hero.title_accent")}
                </span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={180}>
              <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-zinc-400">
                {t("pricing.hero.description")}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={260}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-500">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  {t("pricing.hero.secure_checkout")}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  {t("pricing.hero.includes_kai")}
                </span>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="landing-section !pt-4">
          <div className="landing-container">
            <ScrollReveal className="flex justify-center">
              <PricingBillingToggle value={billingInterval} onChange={setBillingInterval} />
            </ScrollReveal>

            <div className="pricing-cards mt-10">
              {PRICING_PLANS_WITH_PADDLE.map((plan, index) => {
                const display = getDisplayPrice(plan, billingInterval);
                return (
                  <ScrollReveal key={plan.id} delay={index * 120} direction="up">
                    <div className="pricing-plan-column">
                      <article
                        className={`pricing-card pricing-card--${plan.accent} ${
                          plan.popular ? "pricing-card--popular" : ""
                        }`}
                      >
                        {plan.popular && (
                          <div className="pricing-popular-badge">
                            <Zap className="h-3.5 w-3.5" />
                            {t("landing.pricing.most_popular")}
                          </div>
                        )}

                        <div className="pricing-card-header">
                          <div className="flex items-center gap-2">
                            <PlanIcon id={plan.id} />
                            <h2 className="text-xl font-bold text-white">
                              {t(`pricing.plan.${plan.id}.name`)}
                            </h2>
                          </div>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            {t(`pricing.plan.${plan.id}.tagline`)}
                          </p>
                        </div>

                        <div className="pricing-card-price">
                          <span className="pricing-amount">{formatPrice(display.amount)}</span>
                          <span className="text-sm text-zinc-500">
                            / {t("pricing.unit.month")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {billingInterval === "monthly"
                            ? t("pricing.billed_monthly")
                            : t("pricing.billed_yearly_note", {
                                amount: formatPrice(
                                  plan.priceYearlyTotal ?? plan.priceMonthly * 11,
                                ),
                              })}
                        </p>

                        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                          {t(`pricing.plan.${plan.id}.description`)}
                        </p>

                        <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                          {plan.perks.map((_, perkIndex) => (
                            <li
                              key={`${plan.id}-${perkIndex}`}
                              className="flex items-start gap-2 text-sm text-zinc-300"
                            >
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                              <span>
                                {t(`pricing.plan.${plan.id}.perk.${perkIndex}`)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <PlanCheckoutButton
                          plan={plan}
                          interval={billingInterval}
                          className={`landing-btn mt-8 w-full ${
                            plan.popular ? "landing-btn--primary" : "landing-btn--ghost"
                          }`}
                        >
                          {plan.popular
                            ? t("pricing.cta.start_pro")
                            : t("pricing.cta.get_plan", {
                                plan: t(`pricing.plan.${plan.id}.name`),
                              })}
                        </PlanCheckoutButton>
                      </article>

                      <PlanSavingsCard plan={plan} interval={billingInterval} />
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-container">
            <ScrollReveal>
              <div className="text-center">
                <h2 className="landing-section-title">
                  {t("pricing.comparison.title")}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-zinc-400">
                  {t("pricing.comparison.description")}
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={120} className="mt-12">
              <div className="pricing-table-wrap">
                <table className="pricing-table">
                  <thead>
                    <tr>
                      <th scope="col">{t("pricing.comparison.feature")}</th>
                      <th scope="col">{t("pricing.plan.essential.name")}</th>
                      <th scope="col" className="pricing-th-popular">
                        {t("pricing.plan.pro.name")}
                        <span className="pricing-th-badge">
                          {t("pricing.comparison.popular")}
                        </span>
                      </th>
                      <th scope="col">{t("pricing.plan.premium.name")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLAN_COMPARISON.map((row, rowIndex) => (
                      <tr
                        key={row.label}
                        className={row.highlight ? "pricing-row--highlight" : undefined}
                      >
                        <th scope="row">
                          {t(`pricing.comparison.row.${rowIndex}.label`)}
                        </th>
                        <td>
                          <FeatureValue
                            value={
                              typeof row.essential === "string"
                                ? t(`pricing.comparison.row.${rowIndex}.essential`)
                                : row.essential
                            }
                            includedLabel={t("pricing.included")}
                            excludedLabel={t("pricing.not_included")}
                          />
                        </td>
                        <td className="pricing-td-popular">
                          <FeatureValue
                            value={
                              typeof row.pro === "string"
                                ? t(`pricing.comparison.row.${rowIndex}.pro`)
                                : row.pro
                            }
                            emphasize
                            includedLabel={t("pricing.included")}
                            excludedLabel={t("pricing.not_included")}
                          />
                        </td>
                        <td>
                          <FeatureValue
                            value={
                              typeof row.premium === "string"
                                ? t(`pricing.comparison.row.${rowIndex}.premium`)
                                : row.premium
                            }
                            emphasize
                            includedLabel={t("pricing.included")}
                            excludedLabel={t("pricing.not_included")}
                          />
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
                  {t("pricing.final.title")}
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-center text-lg text-zinc-400">
                  {t("pricing.final.description")}
                </p>
                <div className="mt-10">
                  <StoreDownloadButtons />
                </div>
                <div className="mt-6 flex justify-center">
                  <Link href="/" className="landing-btn landing-btn--ghost">
                    {t("pricing.final.back_home")}
                  </Link>
                </div>
                <p className="mt-6 text-center text-xs text-zinc-600">
                  {t("pricing.final.disclaimer", {
                    interval:
                      billingInterval === "yearly"
                        ? t("pricing.yearly").toLocaleLowerCase(lang)
                        : t("pricing.monthly").toLocaleLowerCase(lang),
                  })}
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
