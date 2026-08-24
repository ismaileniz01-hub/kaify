import { describe, expect, it } from "vitest";
import {
  buildStepsChart,
  periodAvailable,
  todayStepsFromRange,
  trendPercent,
} from "@/lib/analytics/steps-chart";

describe("todayStepsFromRange", () => {
  it("does not fall back to the weekly sum when today is missing", () => {
    expect(
      todayStepsFromRange("2026-08-24", [
        { entry_date: "2026-08-22", steps: 8000 },
        { entry_date: "2026-08-23", steps: 9000 },
      ]),
    ).toBe(0);
  });

  it("uses today's row when present", () => {
    expect(
      todayStepsFromRange("2026-08-24", [
        { entry_date: "2026-08-24", steps: 4120 },
      ]),
    ).toBe(4120);
  });
});

describe("buildStepsChart", () => {
  it("uses live weekly values instead of demo data", () => {
    const week = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-08-${String(18 + index).padStart(2, "0")}`,
      steps: index === 6 ? 1000 : 0,
    }));
    const view = buildStepsChart(week, "W", "en");
    expect(view?.values).toEqual([0, 0, 0, 0, 0, 0, 1000]);
    expect(view?.avg).toBe(143);
  });

  it("withholds month and quarter until enough history exists", () => {
    const week = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-08-${String(18 + index).padStart(2, "0")}`,
      steps: 1000,
    }));
    expect(periodAvailable(week, "M")).toBe(false);
    expect(buildStepsChart(week, "M", "en")).toBeNull();
    expect(periodAvailable(week, "3M")).toBe(false);
  });
});

describe("trendPercent", () => {
  it("computes a real half-vs-half change", () => {
    expect(trendPercent([1000, 1000, 2000, 2000])).toBe(100);
  });
});
