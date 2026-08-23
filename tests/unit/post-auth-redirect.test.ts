import { describe, it, expect } from "vitest";
import {
  hasActiveSubscription,
  hasPaidPlan,
  requiresActiveSubscription,
  resolvePostAuthRedirect,
} from "@/lib/auth/post-auth-redirect";

describe("post-auth-redirect", () => {
  it("sends users without a plan to pricing", () => {
    expect(resolvePostAuthRedirect({ tier: null })).toBe("/pricing");
    expect(resolvePostAuthRedirect({ tier: null }, "/welcome")).toBe("/pricing");
  });

  it("sends unpaid native users to My account, not pricing", () => {
    expect(
      resolvePostAuthRedirect({ tier: null }, "/welcome", { native: true }),
    ).toBe("/myaccount");
  });

  it("lets unpaid users reach Settings to delete their account", () => {
    expect(resolvePostAuthRedirect({ tier: null }, "/settings")).toBe("/settings");
    expect(resolvePostAuthRedirect({ tier: null }, "/settings/security")).toBe(
      "/settings/security",
    );
  });

  it("honours requested path when subscribed", () => {
    expect(resolvePostAuthRedirect({ tier: "pro" }, "/welcome")).toBe("/welcome");
  });

  it("does not treat a leftover unpaid tier as access to /welcome", () => {
    expect(
      resolvePostAuthRedirect(
        { tier: "essential", tierStartedAt: null },
        "/welcome",
      ),
    ).toBe("/pricing");
    expect(hasPaidPlan({ tier: "essential", tierStartedAt: null })).toBe(false);
    expect(
      hasPaidPlan({ tier: "pro", tierStartedAt: "2026-08-23T00:00:00.000Z" }),
    ).toBe(true);
  });

  it("detects subscription-gated routes", () => {
    expect(requiresActiveSubscription("/welcome")).toBe(true);
    expect(requiresActiveSubscription("/messages/123")).toBe(true);
    expect(requiresActiveSubscription("/pricing")).toBe(false);
  });

  it("checks active subscription", () => {
    expect(hasActiveSubscription(null)).toBe(false);
    expect(hasActiveSubscription("essential")).toBe(true);
  });
});
