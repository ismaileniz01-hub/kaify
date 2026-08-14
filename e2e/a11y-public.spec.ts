import { test, expect } from "@playwright/test";

const PUBLIC_PAGES = [
  { path: "/", expectH1: true, indexable: true },
  { path: "/pricing", expectH1: true, indexable: true },
  { path: "/privacy", expectH1: true, indexable: true },
  { path: "/login", expectH1: true, indexable: false },
] as const;

test.describe("public accessibility landmarks (A11Y-008 / TEST-003 public)", () => {
  for (const pageDef of PUBLIC_PAGES) {
    test(`${pageDef.path} has main landmark, skip link, and heading`, async ({
      page,
    }) => {
      const res = await page.goto(pageDef.path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("#main-content")).toBeVisible();
      await expect(page.getByRole("link", { name: /skip to content|içeriğe geç/i })).toBeAttached();
      if (pageDef.expectH1) {
        await expect(page.locator("h1").first()).toBeVisible();
      }
      const robots = page.locator('meta[name="robots"]');
      if (pageDef.indexable) {
        const content = (await robots.getAttribute("content")) ?? "";
        expect(content.toLowerCase()).not.toContain("noindex");
      } else {
        await expect(robots).toHaveAttribute("content", /noindex/i);
      }
    });
  }
});
