import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const API_ROOT = join(process.cwd(), "app", "api");
const ROUTE_FILE = "route.ts";

/** OAuth redirect — intentionally outside defineRoute (open-redirect hardening is inline). */
/** Webhooks — raw body required for HMAC signature verification. */
const ROUTE_ALLOWLIST = new Set([
  "app/api/auth/callback/route.ts",
  "app/api/webhooks/lemon-squeezy/route.ts",
]);

const WRAPPER_MARKERS = [
  "defineRoute(",
  "defineRouteRaw(",
  "defineDynamicRoute",
  "defineDynamicRouteRaw",
  "defineCronRoute(",
  "defineCronRouteRaw(",
];

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

describe("api-route-matrix", () => {
  it("every API route uses defineRoute family or is allowlisted", () => {
    const routes = collectRouteFiles(API_ROOT);
    expect(routes.length).toBeGreaterThanOrEqual(43);

    const violations: string[] = [];
    for (const routePath of routes) {
      if (ROUTE_ALLOWLIST.has(routePath)) continue;
      const src = readFileSync(join(process.cwd(), routePath), "utf8");
      if (
        routePath.includes("/api/v1/") &&
        src.includes("export {") &&
        src.includes(' from "')
      ) {
        continue;
      }
      if (!WRAPPER_MARKERS.some((m) => src.includes(m))) {
        violations.push(routePath);
      }
    }

    expect(violations).toEqual([]);
  });
});
