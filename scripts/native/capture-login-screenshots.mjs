/**
 * Capture native login UI at iPhone + Android viewports for visual comparison.
 * Writes PNGs under artifacts/native-login-compare/.
 */
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const root = join(process.cwd(), "native-dist");
const outDir = join(process.cwd(), "artifacts", "native-login-compare");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".map": "application/json",
  ".svg": "image/svg+xml",
};

function contentType(filePath) {
  return MIME[extname(filePath)] || "application/octet-stream";
}

async function main() {
  if (!existsSync(join(root, "index.html"))) {
    console.error("native-dist/index.html missing — run npm run native:build first");
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });

  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const relative =
      urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
    const filePath = join(root, relative);
    if (!filePath.startsWith(root) || !existsSync(filePath)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": contentType(filePath) });
    res.end(readFileSync(filePath));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/`;

  const viewports = [
    { name: "iphone-14", width: 390, height: 844, deviceScaleFactor: 3 },
    { name: "android-pixel", width: 412, height: 915, deviceScaleFactor: 2.625 },
  ];

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
    });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const shot = join(outDir, `native-login-${vp.name}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    results.push({ name: vp.name, path: shot, width: vp.width, height: vp.height });
    await context.close();
  }

  await browser.close();
  server.close();

  writeFileSync(
    join(outDir, "report.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), base, results }, null, 2),
  );
  console.log(
    `[native-login-compare] wrote ${results.map((r) => r.name).join(", ")} → ${outDir}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
