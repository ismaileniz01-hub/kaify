import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (["node_modules", ".next", "coverage", "types", "lang"].includes(name)) {
        continue;
      }
      walk(p, acc);
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) {
      acc.push(p);
    }
  }
  return acc;
}

function locOf(files: string[]): number {
  return files.reduce(
    (n, f) => n + readFileSync(f, "utf8").split(/\r?\n/).length,
    0,
  );
}

describe("coverage scope honesty (TEST-001)", () => {
  it("vitest coverage include spans lib/** and app/api/**", () => {
    const cfg = readFileSync(join(process.cwd(), "vitest.config.ts"), "utf8");
    expect(cfg).toContain('"lib/**/*.ts"');
    expect(cfg).toContain('"app/api/**/*.ts"');
    expect(cfg).not.toMatch(/coverage:\s*\{[\s\S]*include:\s*\[[\s\S]*lib\/api\/response\.ts/);
  });

  it("coverage scope represents a meaningful share of application LOC", () => {
    const appFiles = [
      ...walk(join(process.cwd(), "lib")),
      ...walk(join(process.cwd(), "app")),
      ...walk(join(process.cwd(), "components")),
    ];
    const appLoc = locOf(appFiles);

    // Approximate the coverage include set (lib + app/api, minus documented excludes).
    const included = [
      ...walk(join(process.cwd(), "lib")).filter(
        (f) =>
          !f.includes(`${join("lib", "types")}`) &&
          !f.includes(`${join("lib", "lang")}`) &&
          !/supabase[\\/](client|server|middleware|admin|route-handler)\.ts$/.test(
            f,
          ),
      ),
      ...walk(join(process.cwd(), "app", "api")),
    ];
    const includedLoc = locOf(included);
    const pct = includedLoc / appLoc;

    // Pre-Wave-2 was ~5%. Require at least 25% of application LOC in scope.
    expect(pct).toBeGreaterThanOrEqual(0.25);
    expect(included.length).toBeGreaterThan(100);
  });

  it("thresholds are below the dishonest 75% cherry-picked gate", () => {
    const cfg = readFileSync(join(process.cwd(), "vitest.config.ts"), "utf8");
    const statements = cfg.match(/statements:\s*(\d+)/)?.[1];
    expect(Number(statements)).toBeLessThan(50);
    expect(Number(statements)).toBeGreaterThanOrEqual(20);
  });
});
