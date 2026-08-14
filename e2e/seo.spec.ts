import { test, expect } from "@playwright/test";

test.describe("public SEO HTML", () => {
  test("landing has canonical, description, and H1-capable brand", async ({ page }) => {
    await page.goto("/");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /https:\/\/kaifyai\.org\/?$/);
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute("content", /coach/i);
    await expect(page.locator("#main-content")).toBeVisible();
  });

  test("privacy is indexable and not an auth wall", async ({ page }) => {
    const res = await page.goto("/privacy");
    expect(res?.status()).toBe(200);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://kaifyai.org/privacy",
    );
  });

  test("robots.txt references sitemap and disallows /api/", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Sitemap:\s*https:\/\/kaifyai\.org\/sitemap\.xml/i);
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("Disallow: /chat");
    expect(body).not.toMatch(/Disallow: \/_next\/static/);
  });

  test("sitemap.xml lists only public canonical URLs", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("https://kaifyai.org/pricing");
    expect(xml).not.toContain("/welcome");
    expect(xml).not.toContain("/api/");
    expect(xml).not.toContain("/login");
  });

  test("landing JSON-LD is truthful SoftwareApplication", async ({ page }) => {
    await page.goto("/");
    const json = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(json).toBeTruthy();
    const data = JSON.parse(json!) as { "@graph"?: Array<{ "@type"?: string }> };
    const types = (data["@graph"] ?? []).map((n) => n["@type"]);
    expect(types).toContain("Organization");
    expect(json).not.toMatch(/aggregateRating/);
  });

  test("login is noindex and not in the sitemap contract", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i,
    );
  });
});
