import { describe, expect, it } from "vitest";
import { effectiveDailyBurned } from "@/lib/analytics/resting-burn";

describe("effectiveDailyBurned", () => {
  it("adds logged workout burn on top of maintenance calories", () => {
    expect(effectiveDailyBurned(400, 2100, { includeResting: true })).toBe(2500);
    expect(effectiveDailyBurned(0, 2100, { includeResting: true })).toBe(2100);
    expect(effectiveDailyBurned(400, 2100, { includeResting: false })).toBe(400);
    expect(effectiveDailyBurned(400, null, { includeResting: true })).toBe(400);
  });
});
