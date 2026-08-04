import { describe, expect, it } from "vitest";
import { parsePaddleExpiresAt } from "@/lib/billing/paddle-period";

describe("parsePaddleExpiresAt", () => {
  it("reads camelCase currentBillingPeriod.endsAt", () => {
    expect(
      parsePaddleExpiresAt({
        currentBillingPeriod: { endsAt: "2026-09-01T12:00:00.000Z" },
      }),
    ).toBe("2026-09-01T12:00:00.000Z");
  });

  it("reads snake_case current_billing_period.ends_at", () => {
    expect(
      parsePaddleExpiresAt({
        current_billing_period: { ends_at: "2026-10-15T00:00:00Z" },
      }),
    ).toBe("2026-10-15T00:00:00.000Z");
  });

  it("falls back to next_billed_at", () => {
    expect(
      parsePaddleExpiresAt({ next_billed_at: "2026-11-01T08:30:00.000Z" }),
    ).toBe("2026-11-01T08:30:00.000Z");
  });

  it("returns null when period fields are missing or invalid", () => {
    expect(parsePaddleExpiresAt({})).toBeNull();
    expect(
      parsePaddleExpiresAt({ currentBillingPeriod: { endsAt: "not-a-date" } }),
    ).toBeNull();
  });
});
