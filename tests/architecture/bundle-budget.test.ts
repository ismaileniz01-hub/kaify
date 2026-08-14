import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("bundle budgets (PERF-001)", () => {
  it("keeps gzip budgets at or below the Wave 5 tightened caps", () => {
    const src = readFileSync(
      join(process.cwd(), "scripts/ops/check-bundle-budget.mjs"),
      "utf8",
    );
    const caps = [...src.matchAll(/maxKb: (\d+)/g)].map((m) => Number(m[1]));
    expect(caps).toEqual([135, 350, 125]);
  });
});
