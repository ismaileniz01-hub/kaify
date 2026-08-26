import { describe, expect, it } from "vitest";
import { entitlementIsActive } from "@/lib/billing/entitlement";

describe("entitlementIsActive", () => {
  it("rejects a missing or unpaid snapshot", () => {
    expect(entitlementIsActive(null)).toBe(false);
    expect(entitlementIsActive({ tier: "pro", tierStartedAt: null })).toBe(
      false,
    );
  });

  it("rejects a stale past-expiry paid tier", () => {
    expect(
      entitlementIsActive({
        tier: "pro",
        tierStartedAt: "2026-01-01T00:00:00.000Z",
        tierExpiresAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    ).toBe(false);
  });

  it("accepts an in-term paid tier", () => {
    expect(
      entitlementIsActive({
        tier: "pro",
        tierStartedAt: "2026-01-01T00:00:00.000Z",
        tierExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toBe(true);
  });
});
