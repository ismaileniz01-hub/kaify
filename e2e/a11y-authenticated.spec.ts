import { test } from "@playwright/test";

/**
 * Authenticated axe/E2E (A11Y-003 / TEST-003).
 *
 * Requires an external pre-provisioned OTP inbox (not available in default CI
 * and not inventable from this repo). When present:
 *   E2E_AUTH_ENABLED=1
 *   E2E_OTP_EMAIL
 *   E2E_OTP_CODE
 */
const authEnabled = process.env.E2E_AUTH_ENABLED === "1";
const otpEmail = process.env.E2E_OTP_EMAIL?.trim();
const otpCode = process.env.E2E_OTP_CODE?.trim();

test.describe("authenticated accessibility", () => {
  test("requires external OTP credentials", () => {
    test.skip(
      !authEnabled || !otpEmail || !otpCode,
      "BLOCKED_EXTERNAL_E2E_CREDENTIALS",
    );
  });
});
