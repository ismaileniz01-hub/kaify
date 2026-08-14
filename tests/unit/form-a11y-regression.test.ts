import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FORMS = [
  "components/onboarding/OnboardingProfileForm.tsx",
  "components/ProfileModal.tsx",
  "components/auth/SignupWizard.tsx",
  "components/auth/EmailOtpLogin.tsx",
  "components/auth/StepUpChallenge.tsx",
] as const;

describe("auth/onboarding form a11y (A11Y-006)", () => {
  it.each(FORMS)("%s associates labels via htmlFor or wrapping label+id", (rel) => {
    const src = readFileSync(join(process.cwd(), rel), "utf8");
    expect(src.includes("htmlFor") || src.includes("htmlfor")).toBe(true);
    expect(src).toMatch(/aria-invalid|ariaInvalid/);
  });

  it("EmailOtpLogin no longer mounts a duplicate OTP text input", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/EmailOtpLogin.tsx"),
      "utf8",
    );
    expect(src).toContain("OtpDigitInput");
    // The legacy full-width code input under the digit group must be gone.
    expect(src).not.toMatch(
      /OtpDigitInput[\s\S]*?<input[\s\S]*?autoComplete="one-time-code"/,
    );
  });

  it("OnboardingProfileForm wires aria-describedby for errors/hints", () => {
    const src = readFileSync(
      join(process.cwd(), "components/onboarding/OnboardingProfileForm.tsx"),
      "utf8",
    );
    expect(src).toContain("aria-describedby");
    expect(src).toContain("htmlFor");
  });
});
