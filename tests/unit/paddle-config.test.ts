import { describe, it, expect } from "vitest";
import {
  PADDLE_PRICE_IDS,
  buildPaddlePriceTierMap,
  getPaddlePriceIdForPlan,
} from "@/lib/billing/paddle-config";

describe("paddle-config", () => {
  it("resolves default price IDs for each plan", () => {
    expect(getPaddlePriceIdForPlan("essential", "monthly")).toBe(
      PADDLE_PRICE_IDS.essential.monthly,
    );
    expect(getPaddlePriceIdForPlan("pro", "yearly")).toBe(PADDLE_PRICE_IDS.pro.yearly);
    expect(getPaddlePriceIdForPlan("premium", "monthly")).toBe(
      PADDLE_PRICE_IDS.premium_max.monthly,
    );
  });

  it("maps all price IDs to subscription tiers for webhooks", () => {
    const map = buildPaddlePriceTierMap();
    expect(map[PADDLE_PRICE_IDS.essential.monthly]).toBe("essential");
    expect(map[PADDLE_PRICE_IDS.pro.yearly]).toBe("pro");
    expect(map[PADDLE_PRICE_IDS.premium_max.monthly]).toBe("premium_max");
  });
});
