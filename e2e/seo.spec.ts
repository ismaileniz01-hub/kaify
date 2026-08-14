import { test, expect } from "@playwright/test";

const INDEXABLE = [
  {
    path: "/",
    title: /Kaify Ai/i,
    description: /coach/i,
    canonical: /https:\/\/kaifyai\.org\/?$/,
    jsonLd: true,
  },
  {
    path: "/pricing",
    title: /Pricing/i,
    description: /Essential|Pro|Premium|14\.99/i,
    canonical: "https://kaifyai.org/pricing",
    jsonLd: false,
  },
  {
    path: "/privacy",
    title: /Privacy/i,
    description: /data|privacy/i,
    canonical: "https://kaifyai.org/privacy",
    jsonLd: false,
  },
  {
    path: "/terms",
    title: /Terms/i,
    description: /Terms|governing/i,
    canonical: "https://kaifyai.org/terms",
    jsonLd: false,
  },
  {
    path: "/cookies",
    title: /Cookie/i,
    description: /cookie/i,
    canonical: "https://kaifyai.org/cookies",
    jsonLd: false,
  },
  {
    path: "/kvkk",
    title: /KVKK/i,
    description: /6698|Kişisel Veri/i,
    canonical: "https://kaifyai.org/kvkk",
    jsonLd: false,
  },
] as const;

const PRIVATE = [
  "/welcome",
  "/chat",
  "/analytics",
  "/settings",
  "/leaderboard",
  "/market",
  "/myaccount",
  "/admin",
] as const;

test.describe("rendered public SEO", () => {
  for (const pageDef of INDEXABLE) {
    test(`${pageDef.path} is 200 with canonical OG Twitter H1 main`, async ({
      page,
    }) => {
      const res = await page.goto(`${pageDef.path}?utm_source=test&ref=abc`);
      expect(res?.status()).toBe(200);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveTitle(pageDef.title);
      const desc = page.locator('meta[name="description"]');
      await expect(desc).toHaveAttribute("content", pageDef.description);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        pageDef.canonical,
      );
      const robots = (await page.locator('meta[name="robots"]').getAttribute("content")) ?? "";
      expect(robots.toLowerCase()).not.toContain("noindex");
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /.+/);
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
        "content",
        /.+/,
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        "content",
        pageDef.canonical,
      );
      const ogImage = page.locator('meta[property="og:image"]').first();
      await expect(ogImage).toHaveAttribute("content", /https:\/\/kaifyai\.org\/opengraph-image/);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      );
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main").first()).toBeVisible();
      const html = await page.content();
      expect(html.toLowerCase()).not.toContain("preview.vercel.app");
      if (pageDef.jsonLd) {
        const json = await page.locator('script[type="application/ld+json"]').first().textContent();
        const data = JSON.parse(json!) as { "@graph": Array<Record<string, unknown>> };
        expect(data["@graph"].some((n) => n["@type"] === "Organization")).toBe(true);
        expect(json).not.toMatch(/aggregateRating|reviewCount/);
      }
    });
  }

  test("opengraph image is reachable", async ({ request }) => {
    const res = await request.get("/opengraph-image");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] ?? "").toMatch(/image\//);
  });

  test("legacy terms URL is a single redirect to /terms", async ({ request }) => {
    const res = await request.get("/terms&conditions", { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    const loc = res.headers()["location"] ?? "";
    expect(loc).toMatch(/\/terms\/?$/);
  });

  test("sitemap.xml is a valid urlset of canonical https locs", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] ?? "").toMatch(/xml/i);
    const xml = await res.text();
    expect(xml).toMatch(/<urlset[\s>]/);
    expect(xml).toContain("http://www.sitemaps.org/schemas/sitemap/0.9");
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([
      "https://kaifyai.org",
      "https://kaifyai.org/pricing",
      "https://kaifyai.org/privacy",
      "https://kaifyai.org/terms",
      "https://kaifyai.org/cookies",
      "https://kaifyai.org/kvkk",
    ]);
    expect(xml.match(/<lastmod>/g)?.length).toBe(locs.length);
    expect(xml).not.toContain("http://kaifyai.org");
    expect(xml).not.toContain("vercel.app");
    expect(xml).not.toContain("terms&amp;conditions");
    expect(xml).not.toContain("/index.html");
  });

  test("private routes are not in sitemap and guests are sent to login", async ({
    page,
    request,
  }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const path of [...PRIVATE, "/login", "/signup"]) {
      expect(xml).not.toContain(path);
    }
    for (const path of PRIVATE) {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("login and signup are noindex", async ({ page }) => {
    for (const path of ["/login", "/signup"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/i,
      );
    }
  });
});
