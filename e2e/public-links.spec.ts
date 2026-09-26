import { test, expect } from "@playwright/test";

const SEEDS = ["/", "/pricing", "/privacy", "/terms", "/cookies", "/kvkk", "/delete-account"];

test("public indexable pages have no broken internal links or redirect chains", async ({
  page,
  request,
}) => {
  const seen = new Set<string>();
  const broken: string[] = [];
  const chains: string[] = [];

  for (const seed of SEEDS) {
    await page.goto(seed);
    const hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
      anchors
        .map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? "")
        .filter(Boolean),
    );
    for (const href of hrefs) {
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
        continue;
      }
      let url: URL;
      try {
        url = new URL(href, "http://127.0.0.1:3000");
      } catch {
        broken.push(`${seed} -> malformed ${href}`);
        continue;
      }
      if (url.origin !== "http://127.0.0.1:3000") continue;
      const path = `${url.pathname}${url.search}`;
      if (seen.has(path)) continue;
      seen.add(path);
      const res = await request.get(path, { maxRedirects: 0 });
      const status = res.status();
      if (status >= 300 && status < 400) {
        const loc = res.headers()["location"] ?? "";
        if (path.includes("terms&conditions") && loc.includes("/terms")) {
          continue;
        }
        if (path === "/index.html" && (loc === "/" || loc.endsWith("/"))) {
          continue;
        }
        if (loc.includes("/login")) {
          continue;
        }
        chains.push(`${path} -> ${status} ${loc}`);
        continue;
      }
      if (status >= 400) {
        broken.push(`${seed} -> ${path} (${status})`);
      }
    }
  }

  expect(broken, broken.join("\n")).toEqual([]);
  expect(chains, chains.join("\n")).toEqual([]);
  expect([...seen].some((p) => p.includes("/index.html"))).toBe(false);
});
