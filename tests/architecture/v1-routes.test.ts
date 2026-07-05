import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { API_V1_ROUTES } from "@/lib/api/v1-manifest";

describe("API v1 routes", () => {
  it("every manifest route has a route.ts file", () => {
    const missing: string[] = [];
    for (const route of API_V1_ROUTES) {
      const file = join(process.cwd(), "app", route.replace("/api/", "api/"), "route.ts");
      if (!existsSync(file)) {
        missing.push(route);
      }
    }
    expect(missing).toEqual([]);
  });

  it("defines at least 25 stable v1 endpoints", () => {
    expect(API_V1_ROUTES.length).toBeGreaterThanOrEqual(25);
  });
});
