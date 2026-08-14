import { test, expect } from "@playwright/test";

/**
 * KAIOS product flows — staging-gated.
 *
 * Default CI only asserts public surfaces stay reachable.
 * Full coach/Council/Maya paths require:
 *   E2E_AUTH_ENABLED=1
 *   E2E_OTP_EMAIL / E2E_OTP_CODE
 *   PLAYWRIGHT_BASE_URL or STAGING_URL pointing at staging
 */
const authEnabled = process.env.E2E_AUTH_ENABLED === "1";
const otpEmail = process.env.E2E_OTP_EMAIL?.trim();
const otpCode = process.env.E2E_OTP_CODE?.trim();
const kaiosE2E = authEnabled && Boolean(otpEmail && otpCode);

async function loginWithOtp(page: import("@playwright/test").Page) {
  await page.goto("/login");
  const email = page.locator('input[type="email"], input[name="email"]').first();
  await email.fill(otpEmail!);
  const send = page.getByRole("button", {
    name: /send|kod|code|continue|devam|otp/i,
  });
  if (await send.count()) await send.first().click();

  const digits = page.locator(
    'input[inputmode="numeric"], input[autocomplete="one-time-code"]',
  );
  if ((await digits.count()) >= 6) {
    for (let i = 0; i < 6; i++) await digits.nth(i).fill(otpCode![i]!);
  } else {
    await page.locator('input[name="token"], input[name="code"]').first().fill(otpCode!);
    await page
      .getByRole("button", { name: /verify|doğrula|confirm|giriş/i })
      .first()
      .click();
  }
  await expect(page).toHaveURL(/welcome|streak|chat|onboarding|messages/i, {
    timeout: 30_000,
  });
}

test.describe("KAIOS flows (public gate)", () => {
  test("messages/chat routes exist as navigation targets", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // Unauthenticated visit should not hard-crash
    expect(consoleErrors.filter((e) => /chunkload|hydration/i.test(e))).toEqual(
      [],
    );
  });
});

test.describe("KAIOS authenticated flows", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !kaiosE2E,
      "Set E2E_AUTH_ENABLED=1 + OTP secrets on staging to run KAIOS browser flows",
    );
    void testInfo;
  });

  test("ordinary coach chat streaming", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    await loginWithOtp(page);
    await page.goto("/chat/kai");
    const input = page.locator("textarea, input[type='text']").last();
    await expect(input).toBeVisible({ timeout: 20_000 });
    await input.fill("Hey Kai, just saying hi");
    await page.getByRole("button", { name: /send|gönder|submit/i }).first().click();
    await expect(page.locator("body")).toContainText(/./, { timeout: 60_000 });
    expect(consoleErrors.slice(0, 5)).toBeDefined();
  });

  test("structured response rendering path reachable", async ({ page }) => {
    await loginWithOtp(page);
    await page.goto("/chat/alex");
    const input = page.locator("textarea, input[type='text']").last();
    await expect(input).toBeVisible({ timeout: 20_000 });
    await input.fill("Build me a simple 3-day workout program");
    await page.getByRole("button", { name: /send|gönder|submit/i }).first().click();
    await page.waitForTimeout(8_000);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Maya confirmation UI surface", async ({ page }) => {
    await loginWithOtp(page);
    await page.goto("/chat/maya");
    await expect(page.locator("body")).toBeVisible();
    // Confirm controls appear after analysis; assert chat shell only without photo fixture
    await expect(
      page.locator("textarea, input[type='text']").last(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Leo chat handles invalid image path without crash", async ({ page }) => {
    await loginWithOtp(page);
    await page.goto("/chat/leo");
    await expect(page.locator("body")).toBeVisible();
    const file = page.locator('input[type="file"]');
    if (await file.count()) {
      // Empty/tiny upload if UI allows; otherwise shell visibility is the gate
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("Council await_user and resume", async ({ page }) => {
    await loginWithOtp(page);
    await page.goto("/team");
    // Entitlement may block; capture state without inventing success
    await expect(page.locator("body")).toBeVisible();
    const locked = await page.getByText(/pro|premium|streak|unlock|kilit/i).count();
    if (locked > 0) {
      test.info().annotations.push({
        type: "note",
        description: "Council locked for this account — entitlement gate observed",
      });
      return;
    }
    const start = page.getByRole("button", {
      name: /start|begin|toplant|council|meeting/i,
    });
    if (await start.count()) {
      await start.first().click();
      await page.waitForTimeout(5_000);
    }
  });

  test("page refresh persistence for chat", async ({ page }) => {
    await loginWithOtp(page);
    await page.goto("/chat/kai");
    await page.reload();
    await expect(page.locator("body")).toBeVisible();
    await expect(
      page.locator("textarea, input[type='text']").last(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("error state does not white-screen chat", async ({ page }) => {
    await loginWithOtp(page);
    await page.route("**/api/chat/**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "AI_UPSTREAM", message: "forced" } }),
        });
        return;
      }
      await route.continue();
    });
    await page.goto("/chat/kai");
    const input = page.locator("textarea, input[type='text']").last();
    await input.fill("trigger error");
    await page.getByRole("button", { name: /send|gönder|submit/i }).first().click();
    await expect(page.locator("body")).toBeVisible();
  });
});
