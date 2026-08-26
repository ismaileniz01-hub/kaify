"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import { InlineAlert } from "@/components/InlineAlert";
import { StepUpChallenge } from "@/components/auth/StepUpChallenge";
import { usePaddle } from "@/components/billing/PaddleProvider";
import { useBillingPortal } from "@/components/billing/useBillingPortal";
import { useSessionOptional } from "@/lib/session-contexts";
import { useNativeApp } from "@/lib/native/platform";
import { openInstalledAppOrWebsite } from "@/lib/billing/native-web-checkout";
import { hasPaidPlan } from "@/lib/auth/post-auth-redirect";
import { useLang } from "@/lib/lang-context";
import {
  PADDLE_BUYER_TERMS_URL,
  PADDLE_PRIVACY_URL,
  PADDLE_REFUND_POLICY_URL,
} from "@/lib/legal/constants";
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
  const session = useSessionOptional();
  const openedPlan = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { shouldOpenPaddleCheckoutInApp, parseCheckoutPlanParam } = await import(
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
        return;
      }

      const planId = parseCheckoutPlanParam(searchParams.get("checkout"));
      if (!planId || openedPlan.current) return;
      const plan = PRICING_PLANS_WITH_PADDLE.find((item) => item.id === planId);
      const priceId = plan?.paddlePriceId;
      if (!priceId) return;

      let userId = session?.profile?.id ?? null;
      let subscribed = hasPaidPlan(session?.profile);
      if (!userId) {
        const { fetchWebCheckoutProfile } = await import(
          "@/lib/billing/web-checkout-profile"
        );
        let fetched = await fetchWebCheckoutProfile();
        if (!fetched) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          if (cancelled) return;
          fetched = await fetchWebCheckoutProfile();
        }
        if (cancelled || !fetched) return;
        userId = fetched.id;
        subscribed = hasPaidPlan(fetched);
      }
      if (subscribed) return;

      openedPlan.current = true;
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { user_id: userId },
        settings: { showAddDiscounts: true },
      });
      window.history.replaceState(null, "", "/pricing");
    })();
    return () => {
      cancelled = true;
    };
  }, [paddle, ready, searchParams, session?.profile]);

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
      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => openInstalledAppOrWebsite()}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-bold text-zinc-950 transition hover:bg-emerald-400"
        >
          {t("pricing.checkout.open_app")}
        </button>
        <Link
          href="/welcome"
          className="text-xs font-medium text-zinc-400 underline-offset-2 hover:text-white hover:underline"
        >
          {t("pricing.checkout.continue_web")}
        </Link>
      </div>
    </div>
  );
}

function PlanCheckoutButton({
  plan,
  interval,
  className,
  children,
  hasPlan,
  onManagePlan,
  discountCode,
}: {
  plan: PricingPlan;
  interval: BillingInterval;
  className: string;
  children: ReactNode;
  hasPlan: boolean;
  onManagePlan: () => void;
  discountCode?: string;
}) {
  const router = useRouter();
  const { paddle, ready, configured } = usePaddle();
  const session = useSessionOptional();
  const profile = session?.profile ?? null;
  const native = useNativeApp();
  const { t } = useLang();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleClick = useCallback(() => {
    void (async () => {
      setCheckoutError(null);
      const { shouldOpenPaddleCheckoutInApp } = await import(
        "@/lib/billing/native-web-checkout"
      );
      if (!(await shouldOpenPaddleCheckoutInApp())) {
        const { WEB_PRICING_URL } = await import(
          "@/lib/billing/native-web-checkout"
        );
        const { openExternalUrl } = await import("@/lib/native/open-external");
        await openExternalUrl(WEB_PRICING_URL);
        return;
      }
      let userId = profile?.id ?? null;
      let subscribed = hasPlan || hasPaidPlan(profile);
      if (!userId) {
        const { fetchWebCheckoutProfile } = await import(
          "@/lib/billing/web-checkout-profile"
        );
        const fetched = await fetchWebCheckoutProfile();
        if (!fetched) {
          router.push("/signup?next=/pricing");
          return;
        }
        userId = fetched.id;
        subscribed = hasPaidPlan(fetched);
      }
      if (subscribed) {
        onManagePlan();
        return;
      }
      const priceId =
        interval === "yearly" ? plan.paddlePriceIdYearly : plan.paddlePriceId;
      if (configured && ready && paddle && priceId) {
        const code = discountCode?.trim();
        paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customData: { user_id: userId },
          ...(code ? { discountCode: code } : {}),
          settings: {
            showAddDiscounts: true,
          },
        });
        return;
      }
      setCheckoutError(t("pricing.checkout_unavailable"));
    })();
  }, [
    configured,
    discountCode,
    hasPlan,
    interval,
    onManagePlan,
    paddle,
    plan.paddlePriceId,
    plan.paddlePriceIdYearly,
    profile,
    ready,
    router,
    t,
  ]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={className}
      >
        {native
          ? t("pricing.available_on_web")
          : hasPlan
            ? t("pricing.cta.manage_plan")
            : children}
      </button>
      {checkoutError ? (
        <p className="mt-2 text-center text-xs text-amber-300/90">{checkoutError}</p>
      ) : null}
    </>
  );
}

export function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [discountCode, setDiscountCode] = useState("");
  const native = useNativeApp();
  const { lang, t } = useLang();
  const session = useSessionOptional();
  const hasPlan = hasPaidPlan(session?.profile);
  const {
    openPortal,
    portalLoading,
    needsStepUp,
    setNeedsStepUp,
    portalError,
  } = useBillingPortal();

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

            {!hasPlan ? (
              <ScrollReveal delay={80} className="mx-auto mt-6 max-w-md">
                <label className="block text-left">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                    {t("pricing.discount_code.label")}
                  </span>
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder={t("pricing.discount_code.placeholder")}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm tracking-wider text-white outline-none placeholder:text-zinc-600 focus:border-purple-500/40"
                  />
                  <span className="mt-1.5 block text-[11px] leading-snug text-zinc-500">
                    {t("pricing.discount_code.hint")}
                  </span>
                </label>
              </ScrollReveal>
            ) : null}

            {(portalError || needsStepUp) && (
              <div className="mx-auto mt-6 max-w-lg">
                {portalError ? (
                  <InlineAlert variant="error" message={portalError} />
                ) : null}
                {needsStepUp ? (
                  <div className="mt-3">
                    <StepUpChallenge
                      onCancel={() => setNeedsStepUp(false)}
                      onVerified={() => {
                        setNeedsStepUp(false);
                        void openPortal();
                      }}
                    />
                  </div>
                ) : null}
              </div>
            )}

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
                        <p className="mt-1 text-xs text-zinc-500">
                          {t("pricing.depends_on_region")}
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
                          hasPlan={hasPlan}
                          discountCode={discountCode}
                          onManagePlan={() => void openPortal()}
                          className={`landing-btn mt-8 w-full ${
                            plan.popular ? "landing-btn--primary" : "landing-btn--ghost"
                          } ${portalLoading && hasPlan ? "opacity-70" : ""}`}
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

            <ScrollReveal delay={200} className="mx-auto mt-10 max-w-3xl">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm leading-relaxed text-zinc-400">
                <p>{t("pricing.legal_disclosure")}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {t("pricing.health_warning_short")}
                </p>
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <a
                    href={PADDLE_BUYER_TERMS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400/90 underline-offset-2 hover:underline"
                  >
                    {t("pricing.paddle_buyer_terms")}
                  </a>
                  <a
                    href={PADDLE_REFUND_POLICY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400/90 underline-offset-2 hover:underline"
                  >
                    {t("pricing.paddle_refund_policy")}
                  </a>
                  <a
                    href={PADDLE_PRIVACY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400/90 underline-offset-2 hover:underline"
                  >
                    {t("pricing.paddle_privacy")}
                  </a>
                  <Link
                    href="/terms"
                    className="text-emerald-400/90 underline-offset-2 hover:underline"
                  >
                    {t("legal.terms")}
                  </Link>
                  <Link
                    href="/disclaimer"
                    className="text-emerald-400/90 underline-offset-2 hover:underline"
                  >
                    {t("legal.disclaimer")}
                  </Link>
                </p>
              </div>
            </ScrollReveal>
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
              <p className="mt-4 text-center text-sm text-zinc-500">
                {t("pricing.depends_on_region")}
              </p>
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
