"use client";

import {
  formatPrice,
  formatSavings,
  getDisplayPrice,
  getElsewhereStackItems,
  getPlanSavings,
  type BillingInterval,
  type PricingPlan,
} from "@/lib/marketing/pricing-plans";
import { useLang } from "@/lib/lang-context";

type Props = {
  plan: PricingPlan;
  interval: BillingInterval;
};

export function PlanSavingsCard({ plan, interval }: Props) {
  const { t } = useLang();
  const savings = getPlanSavings(plan);
  const display = getDisplayPrice(plan, interval);
  const stackItems = getElsewhereStackItems(plan.id);
  const showYearlySavings = interval === "yearly";

  return (
    <div className="pricing-savings-card">
      <p className="pricing-savings-card__eyebrow">
        {t("landing.value.eyebrow")}
      </p>
      <p className="pricing-savings-card__title">
        {t("pricing.savings.title", {
          plan: t(`pricing.plan.${plan.id}.name`),
        })}
      </p>

      <div className="pricing-savings-card__stack">
        {stackItems.map((item, index) => (
          <div key={`${plan.id}-${index}`} className="pricing-savings-card__stack-row">
            <div className="pricing-savings-card__stack-label">
              <span className="pricing-savings-card__stack-x" aria-hidden>
                ✕
              </span>
              <span>{item.icon}</span>
              <span>{t(`pricing.elsewhere.${plan.id}.${index}`)}</span>
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
              <p className="pricing-savings-card__winner-name">
                K.AIFY {t(`pricing.plan.${plan.id}.name`)}
              </p>
              <p className="pricing-savings-card__winner-sub">
                {t("pricing.savings.all_in_one")}
              </p>
            </div>
          </div>
          <div className="pricing-savings-card__winner-price">
            <p>{formatPrice(display.amount)}</p>
            <p>/{t("pricing.unit.month")}</p>
          </div>
        </div>

        <div className="pricing-savings-card__save-banner">
          <span aria-hidden>💰</span>
          <span>
            {t("landing.value.save_up_to")}{" "}
            <strong>
              {formatSavings(savings.monthlyVsElsewhere)}/
              {t("pricing.unit.month")}
            </strong>
            {" · "}
            <strong>
              {formatSavings(savings.yearlyVsElsewhere)}/
              {t("pricing.unit.year")}
            </strong>
          </span>
        </div>

        {showYearlySavings && (
          <p className="pricing-savings-card__billed">
            {t("pricing.billed_yearly_note", {
              amount: formatPrice(plan.priceYearlyTotal ?? plan.priceMonthly * 11),
            })}
          </p>
        )}
      </div>
    </div>
  );
}
