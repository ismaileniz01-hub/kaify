import { describe, expect, it } from "vitest";
import { parseCheckoutPlanParam } from "@/lib/billing/native-web-checkout";

describe("parseCheckoutPlanParam", () => {
  it("accepts plan ids and treats 1/true as Pro", () => {
    expect(parseCheckoutPlanParam("essential")).toBe("essential");
    expect(parseCheckoutPlanParam("pro")).toBe("pro");
    expect(parseCheckoutPlanParam("premium")).toBe("premium");
    expect(parseCheckoutPlanParam("1")).toBe("pro");
    expect(parseCheckoutPlanParam("true")).toBe("pro");
  });

  it("rejects unknown values", () => {
    expect(parseCheckoutPlanParam(null)).toBeNull();
    expect(parseCheckoutPlanParam("")).toBeNull();
    expect(parseCheckoutPlanParam("enterprise")).toBeNull();
  });
});
