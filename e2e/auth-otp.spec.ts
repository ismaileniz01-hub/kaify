import { test, expect } from "@playwright/test";

/**
 * Authenticated critical path (TD-002).
 *
 * Staging-gated: set E2E_AUTH_ENABLED=1 plus a pre-provisioned magic path.
 * Without secrets this file only asserts the login surface stays reachable —
 * full OTP→check-in stays out of default CI to avoid flake / inbox deps.
 */
const authEnabled = process.env.E2E_AUTH_ENABLED === "1";
const otpEmail = process.env.E2E_OTP_EMAIL?.trim();
const otpCode = process.env.E2E_OTP_CODE?.trim();

test.describe("auth critical path", () => {
  test("login response nonces every Next script allowed by strict CSP", async ({
    request,
  }) => {
    const response = await request.get("/login?audit=csp-contract");
    expect(response.status()).toBe(200);

    const csp = response.headers()["content-security-policy"];
    const nonce = csp?.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeTruthy();
    expect(csp).toContain("'strict-dynamic'");

    const html = await response.text();
    const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(
      (match) => match[1],
    );
    expect(scripts.length).toBeGreaterThan(0);
    expect(
      scripts.every((attributes) =>
        attributes.includes(`nonce="${nonce}"`),
      ),
    ).toBe(true);
  });

  test("login page exposes email OTP entry without CSP violations", async ({
    page,
  }) => {
    const cspViolations: string[] = [];
    page.on("console", (message) => {
      if (message.text().toLowerCase().includes("content security policy")) {
        cspViolations.push(message.text());
      }
    });

    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
    // Email field is always present for OTP flow (copy may be i18n).
    const email = page.locator('input[type="email"], input[name="email"]').first();
    await expect(email).toBeVisible({ timeout: 8_000 });
    expect(cspViolations).toEqual([]);
  });

  test("OTP → welcome when E2E_AUTH_ENABLED credentials provided", async ({
    page,
  }) => {
    test.skip(
      !authEnabled || !otpEmail || !otpCode,
      "Set E2E_AUTH_ENABLED=1, E2E_OTP_EMAIL, E2E_OTP_CODE on staging",
    );

    await page.goto("/login");
    const email = page.locator('input[type="email"], input[name="email"]').first();
    await email.fill(otpEmail!);

    const send = page.getByRole("button", {
      name: /send|kod|code|continue|devam|otp/i,
    });
    if (await send.count()) {
      await send.first().click();
    }

    // Digit inputs or single token field
    const digits = page.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"]');
    if ((await digits.count()) >= 6) {
      const code = otpCode!;
      for (let i = 0; i < 6; i++) {
        await digits.nth(i).fill(code[i]!);
      }
    } else {
      await page.locator('input[name="token"], input[name="code"]').first().fill(otpCode!);
      await page.getByRole("button", { name: /verify|doğrula|confirm|giriş/i }).first().click();
    }

    await expect(page).toHaveURL(/welcome|streak|chat|onboarding/i, {
      timeout: 30_000,
    });
  });
});
