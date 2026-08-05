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

  test("cookie banner enters and exits with premium presence", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("dialog", {
      name: /cookie|privacy|çerez/i,
    });
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute("data-state", "entered");

    await banner
      .getByRole("button", { name: /reject|reddet|decline/i })
      .click();
    await expect(banner).toBeHidden({ timeout: 1_000 });
  });

  test("reduced motion disables page entrance animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/login");
    const animationName = await page
      .locator(".phone-shell")
      .first()
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(animationName).toBe("none");
  });
});
