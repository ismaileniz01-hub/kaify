"use client";

import type { BillingInterval } from "@/lib/marketing/pricing-plans";
import { useLang } from "@/lib/lang-context";

type Props = {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
};

export function PricingBillingToggle({ value, onChange }: Props) {
  const { t } = useLang();

  return (
    <div
      className="pricing-billing-toggle"
      role="group"
      aria-label={t("pricing.billing_period")}
    >
      <button
        type="button"
        className={`pricing-billing-toggle__btn ${
          value === "monthly" ? "pricing-billing-toggle__btn--active" : ""
        }`}
        onClick={() => onChange("monthly")}
        aria-pressed={value === "monthly"}
      >
        {t("pricing.monthly")}
      </button>
      <button
        type="button"
        className={`pricing-billing-toggle__btn ${
          value === "yearly" ? "pricing-billing-toggle__btn--active" : ""
        }`}
        onClick={() => onChange("yearly")}
        aria-pressed={value === "yearly"}
      >
        {t("pricing.yearly")}
        <span className="pricing-billing-toggle__badge">
          {t("pricing.one_month_free")}
        </span>
      </button>
    </div>
  );
}
