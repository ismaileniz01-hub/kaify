import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const CHAT_API_ROOT = join(process.cwd(), "app", "api", "chat");
const ROUTE_FILE = "route.ts";

function collectRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectRouteFiles(full));
    } else if (entry === ROUTE_FILE) {
      out.push(relative(process.cwd(), full).replace(/\\/g, "/"));
    }
  }
  return out.sort();
}

/** Routes that call AI but are read-only history (no health processing). */
const CONSENT_EXEMPT = new Set(["app/api/chat/team/route.ts"]);

describe("consent gate", () => {
  it("AI chat routes require requireAiConsent", () => {
    const routes = collectRouteFiles(CHAT_API_ROOT);
    expect(routes.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const routePath of routes) {
      if (CONSENT_EXEMPT.has(routePath)) continue;
      const src = readFileSync(join(process.cwd(), routePath), "utf8");
      if (src.includes("requireAi:") || src.includes("requirePhotoConsent")) {
        if (!src.includes("requireAiConsent: true")) {
          violations.push(routePath);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("team meeting POST requires AI consent when generating AI content", () => {
    const src = readFileSync(join(process.cwd(), "app/api/chat/team/route.ts"), "utf8");
    expect(src).toContain("requireAiConsent: true");
  });
});
