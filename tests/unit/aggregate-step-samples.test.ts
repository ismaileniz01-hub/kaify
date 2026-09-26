import { describe, expect, it } from "vitest";
import { aggregateStepSamples } from "@/lib/health/aggregate-samples";

describe("aggregateStepSamples", () => {
  it("sums samples onto local calendar days", () => {
    const rows = aggregateStepSamples(
      [
        { startDate: "2026-08-24T08:00:00.000Z", value: 1200 },
        { startDate: "2026-08-24T18:00:00.000Z", value: 800 },
        { startDate: "2026-08-23T12:00:00.000Z", value: 4000 },
      ],
      "UTC",
    );
    expect(rows).toEqual([
      { date: "2026-08-23", steps: 4000 },
      { date: "2026-08-24", steps: 2000 },
    ]);
  });

  it("caps a day at 100000", () => {
    const rows = aggregateStepSamples(
      [
        { startDate: "2026-08-24T00:00:00.000Z", value: 90_000 },
        { startDate: "2026-08-24T12:00:00.000Z", value: 20_000 },
      ],
      "UTC",
    );
    expect(rows[0]?.steps).toBe(100_000);
  });
});
