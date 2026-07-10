"use client";

import {
  ELSEWHERE_STACK_ITEMS,
  formatPrice,
  formatSavings,
  getDisplayPrice,
  getPlanSavings,
  type BillingInterval,
  type PricingPlan,
} from "@/lib/marketing/pricing-plans";

type Props = {
  plan: PricingPlan;
  interval: BillingInterval;
};

export function PlanSavingsCard({ plan, interval }: Props) {
  const savings = getPlanSavings(plan);
  const display = getDisplayPrice(plan, interval);
  const showYearlySavings = interval === "yearly";

  return (
    <div className="pricing-savings-card">
      <p className="pricing-savings-card__eyebrow">Value comparison</p>
      <p className="pricing-savings-card__title">
        {plan.name} vs hiring separately
      </p>

      <div className="pricing-savings-card__stack">
        {ELSEWHERE_STACK_ITEMS.map((item) => (
          <div key={item.label} className="pricing-savings-card__stack-row">
            <div className="pricing-savings-card__stack-label">
              <span className="pricing-savings-card__stack-x" aria-hidden>
                ✕
              </span>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            <span className="pricing-savings-card__stack-price">{item.priceLabel}</span>
          </div>
        ))}
      </div>

      <div className="pricing-savings-card__divider" aria-hidden>
        <span>↓</span>
      </div>

      <div className="pricing-savings-card__winner">
        <div className="pricing-savings-card__winner-head">
          <div className="pricing-savings-card__winner-brand">
            <span className="pricing-savings-card__check" aria-hidden>
              ✓
            </span>
            <div>
              <p className="pricing-savings-card__winner-name">K.AIFY {plan.name}</p>
              <p className="pricing-savings-card__winner-sub">All-in-one coaching team</p>
            </div>
          </div>
          <div className="pricing-savings-card__winner-price">
            <p>{formatPrice(display.amount)}</p>
            <p>{display.suffix}</p>
          </div>
        </div>

        <div className="pricing-savings-card__save-banner">
          <span aria-hidden>💰</span>
          <span>
            Save up to{" "}
            <strong>{formatSavings(savings.monthlyVsElsewhere)}/month</strong>
            {" · "}
            <strong>{formatSavings(savings.yearlyVsElsewhere)}/year</strong>
          </span>
        </div>

        {showYearlySavings && (
          <p className="pricing-savings-card__billed">{display.billedNote}</p>
        )}
      </div>
    </div>
  );
}
