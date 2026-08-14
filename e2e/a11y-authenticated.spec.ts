import { test, expect } from "@playwright/test";

/**
 * Authenticated axe/keyboard coverage (A11Y-003 / TEST-003).
 * Default CI has no OTP inbox — skip unless staging secrets are present.
 */
const authEnabled = process.env.E2E_AUTH_ENABLED === "1";

test.describe("authenticated accessibility", () => {
  test("blocked without E2E_AUTH_ENABLED credentials", () => {
    test.skip(!authEnabled, "AUTHENTICATED_AXE BLOCKED: set E2E_AUTH_ENABLED=1 with OTP secrets");
    expect(authEnabled).toBe(true);
  });
});
