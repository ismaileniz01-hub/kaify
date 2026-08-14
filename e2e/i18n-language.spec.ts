import { test, expect } from "@playwright/test";

async function setLang(page: import("@playwright/test").Page, lang: string) {
  await page.addInitScript((code) => {
    window.localStorage.setItem("kaify-lang", code);
    document.cookie = `kaify-lang=${code}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, lang);
}

test.describe("language smoke", () => {
  test("Turkish landing stays single-language in the hero", async ({ page }) => {
    await setLang(page, "tr");
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await expect(page.getByRole("link", { name: /içeriğe geç/i })).toBeAttached();
    const hero = page.locator("#main-content");
    await expect(hero).toBeVisible();
    const text = (await hero.innerText()).toLowerCase();
    expect(text).not.toMatch(/\byour personal\b/);
    expect(text).not.toMatch(/\bscroll to explore\b/);
  });

  test("English landing keeps English skip + html lang", async ({ page }) => {
    await setLang(page, "en");
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("link", { name: /skip to content/i })).toBeAttached();
  });

  test("German login page respects cookie language", async ({ page }) => {
    await setLang(page, "de");
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toMatch(/\bsign in to continue\b/);
  });

  test("Arabic sets rtl document direction", async ({ page }) => {
    await setLang(page, "ar");
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("Arabic login and pricing keep rtl", async ({ page }) => {
    await setLang(page, "ar");
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.goto("/pricing");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("pricing follows Turkish cookie without English hero leftovers", async ({
    page,
  }) => {
    await setLang(page, "tr");
    await page.goto("/pricing");
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    const text = (await page.locator("body").innerText()).toLowerCase();
    expect(text).not.toMatch(/\bchoose your plan\b/);
  });
});
