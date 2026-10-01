import { describe, expect, it } from "vitest";
import {
  subscriptionGrantsAccess,
  subscriptionIsCanceled,
} from "@/lib/billing/subscription-access";

describe("subscriptionGrantsAccess", () => {
  it("grants access only for an active paid subscription", () => {
    expect(subscriptionGrantsAccess("active")).toBe(true);
    expect(subscriptionGrantsAccess("ACTIVE")).toBe(true);
    expect(subscriptionGrantsAccess("trialing")).toBe(false);
  });

  it("does not revoke on scheduled cancel — only real canceled status", () => {
    expect(subscriptionGrantsAccess("canceled")).toBe(false);
    expect(subscriptionIsCanceled("canceled")).toBe(true);
    expect(subscriptionIsCanceled("cancelled")).toBe(true);
  });

  it("keeps paused and past_due as non-granting for new grants but not canceled", () => {
    expect(subscriptionGrantsAccess("paused")).toBe(false);
    expect(subscriptionGrantsAccess("past_due")).toBe(false);
    expect(subscriptionIsCanceled("paused")).toBe(false);
    expect(subscriptionIsCanceled("past_due")).toBe(false);
  });
});
