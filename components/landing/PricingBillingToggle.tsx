"use client";

import type { BillingInterval } from "@/lib/marketing/pricing-plans";

type Props = {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
};

export function PricingBillingToggle({ value, onChange }: Props) {
  return (
    <div className="pricing-billing-toggle" role="group" aria-label="Billing period">
      <button
        type="button"
        className={`pricing-billing-toggle__btn ${
          value === "monthly" ? "pricing-billing-toggle__btn--active" : ""
        }`}
        onClick={() => onChange("monthly")}
        aria-pressed={value === "monthly"}
      >
        Monthly
      </button>
      <button
        type="button"
        className={`pricing-billing-toggle__btn ${
          value === "yearly" ? "pricing-billing-toggle__btn--active" : ""
        }`}
        onClick={() => onChange("yearly")}
        aria-pressed={value === "yearly"}
      >
        Yearly
        <span className="pricing-billing-toggle__badge">1 month free</span>
      </button>
    </div>
  );
}
