import { test, expect } from "@playwright/test";

/**
 * Public smoke — no auth fixtures required.
 * Auth OTP→session path: see `e2e/auth-otp.spec.ts` (E2E_AUTH_ENABLED staging gate).
 */
test.describe("public smoke", () => {
  test("landing renders brand and main landmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByRole("link", { name: /skip to content/i })).toBeAttached();
  });

  test("health endpoint is reachable", async ({ request }) => {
    const res = await request.get("/api/health", {
      headers: { "User-Agent": "Mozilla/5.0 KaifyE2E" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });

  test("login page is reachable", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
  });
});
