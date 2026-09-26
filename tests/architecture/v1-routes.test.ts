import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { API_V1_ROUTES } from "@/lib/api/v1-manifest";

describe("API v1 routes", () => {
  const v1Root = join(process.cwd(), "app", "api", "v1");

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

  it("every route.ts file is represented in the manifest", () => {
    const files = readdirSync(v1Root, {
      recursive: true,
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile() && entry.name === "route.ts")
      .map((entry) => join(entry.parentPath, entry.name));
    const discovered = files
      .map((file) => {
        const directory = relative(v1Root, file)
          .split(sep)
          .slice(0, -1)
          .join("/");
        return `/api/v1/${directory}`;
      })
      .sort();

    expect(discovered).toEqual([...API_V1_ROUTES].sort());
  });

  it("keeps the architecture endpoint count aligned with the manifest", () => {
    const readme = readFileSync(
      join(process.cwd(), "docs", "architecture", "README.md"),
      "utf8",
    );
    expect(readme).toContain(
      `\`/api/v1\` (${API_V1_ROUTES.length} routes)`,
    );
  });

  it("defines at least 25 stable v1 endpoints", () => {
    expect(API_V1_ROUTES.length).toBeGreaterThanOrEqual(25);
  });
});
