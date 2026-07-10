import { describe, it, expect } from "vitest";
import {
  hasActiveSubscription,
  requiresActiveSubscription,
  resolvePostAuthRedirect,
} from "@/lib/auth/post-auth-redirect";

describe("post-auth-redirect", () => {
  it("sends users without a plan to pricing", () => {
    expect(resolvePostAuthRedirect({ tier: null })).toBe("/pricing");
    expect(resolvePostAuthRedirect({ tier: null }, "/welcome")).toBe("/pricing");
  });

  it("honours requested path when subscribed", () => {
    expect(resolvePostAuthRedirect({ tier: "pro" }, "/welcome")).toBe("/welcome");
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
