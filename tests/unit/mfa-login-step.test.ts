import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { needsMfaStepAfterSignIn } from "@/lib/auth/mfa";

const client = (currentLevel: string | null, nextLevel: string | null, error: unknown = null) =>
  ({
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: error ? null : { currentLevel, nextLevel },
          error,
        }),
      },
    },
  }) as never;

describe("MFA step after first-factor sign-in", () => {
  it("is required when the account has TOTP and the session is aal1", async () => {
    expect(await needsMfaStepAfterSignIn(client("aal1", "aal2"))).toBe(true);
  });

  it("is not required without TOTP, after AAL2, or without a client", async () => {
    expect(await needsMfaStepAfterSignIn(client("aal1", "aal1"))).toBe(false);
    expect(await needsMfaStepAfterSignIn(client("aal2", "aal2"))).toBe(false);
    expect(await needsMfaStepAfterSignIn(null)).toBe(false);
  });

  it("the login form checks it before any API call that needs the session", () => {
    const src = readFileSync("components/auth/EmailOtpLogin.tsx", "utf8");
    const goAfterAuth = src.slice(src.indexOf("const goAfterAuth = useCallback"));
    const check = goAfterAuth.indexOf("needsMfaStepAfterSignIn(");
    expect(check).toBeGreaterThan(-1);
    expect(goAfterAuth.indexOf('router.replace("/login/mfa")')).toBeGreaterThan(check);
    expect(check).toBeLessThan(goAfterAuth.indexOf("applyPendingReferral()"));
    expect(check).toBeLessThan(goAfterAuth.indexOf("fetchWebCheckoutProfile()"));
  });
});
