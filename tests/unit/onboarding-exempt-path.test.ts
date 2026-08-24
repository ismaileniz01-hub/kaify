import { describe, expect, it } from "vitest";
import { isOnboardingExemptPath } from "@/lib/onboarding/exempt-path";

describe("isOnboardingExemptPath", () => {
  it("lets billing and account-deletion routes through", () => {
    expect(isOnboardingExemptPath("/settings")).toBe(true);
    expect(isOnboardingExemptPath("/settings/foo")).toBe(true);
    expect(isOnboardingExemptPath("/delete-account")).toBe(true);
    expect(isOnboardingExemptPath("/myaccount")).toBe(true);
    expect(isOnboardingExemptPath("/signup")).toBe(true);
  });

  it("still gates the rest of the app", () => {
    expect(isOnboardingExemptPath("/welcome")).toBe(false);
    expect(isOnboardingExemptPath("/analytics")).toBe(false);
    expect(isOnboardingExemptPath("/chat/kai")).toBe(false);
  });
});
