import { test, expect } from "@playwright/test";

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
const canAuth = Boolean(authEnabled && otpEmail && otpCode);

const AUTH_ROUTES = [
  "/welcome",
  "/chat",
  "/analytics",
  "/settings",
  "/leaderboard",
  "/market",
  "/myaccount",
] as const;

async function signInWithOtp(page: import("@playwright/test").Page) {
  await page.goto("/login");
  const email = page.locator('input[type="email"], input[name="email"]').first();
  await email.fill(otpEmail!);
  const send = page.getByRole("button", {
    name: /send|kod|code|continue|devam|otp/i,
  });
  if (await send.count()) {
    await send.first().click();
  }
  const digits = page.locator(
    'input[inputmode="numeric"], input[autocomplete="one-time-code"]',
  );
  if ((await digits.count()) >= 6) {
    const code = otpCode!;
    for (let i = 0; i < 6; i++) {
      await digits.nth(i).fill(code[i]!);
    }
  } else {
    await page.locator('input[name="token"], input[name="code"]').first().fill(otpCode!);
    await page.getByRole("button", { name: /verify|doğrula|confirm|giriş/i }).first().click();
  }
  await expect(page).toHaveURL(/welcome|streak|chat|onboarding/i, { timeout: 30_000 });
}

test.describe("authenticated accessibility", () => {
  test("requires external OTP credentials", () => {
    test.skip(!canAuth, "BLOCKED_EXTERNAL_E2E_CREDENTIALS");
  });

  for (const path of AUTH_ROUTES) {
    test(`${path} has H1, main landmark, and named controls`, async ({ page }) => {
      test.skip(!canAuth, "BLOCKED_EXTERNAL_E2E_CREDENTIALS");
      await signInWithOtp(page);
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.locator("main, #main-content").first()).toBeVisible();
      const unnamed = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("button, a[href], [role='button']"))
          .filter((el) => {
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") return false;
            const name = (
              el.getAttribute("aria-label") ||
              el.getAttribute("aria-labelledby") ||
              el.textContent ||
              ""
            ).trim();
            return name.length === 0;
          })
          .map((el) => el.outerHTML.slice(0, 120));
      });
      expect(unnamed, unnamed.join("\n")).toEqual([]);
    });
  }
});
