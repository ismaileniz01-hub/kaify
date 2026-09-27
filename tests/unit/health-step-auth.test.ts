import { describe, expect, it } from "vitest";
import {
  localDateKeyFromIso,
  pickStepSamples,
  stepReadWindow,
} from "@/lib/health/aggregate-samples";
import { interpretStepAuthorization } from "@/lib/native/health-steps";

describe("step authorization", () => {
  it("treats an explicit denial as denied", () => {
    expect(
      interpretStepAuthorization({ readDenied: ["steps"], readAuthorized: [] }),
    ).toBe(false);
  });

  it("treats an explicit grant as connected", () => {
    expect(
      interpretStepAuthorization({ readAuthorized: ["steps"], readDenied: [] }),
    ).toBe(true);
  });

  it("treats an empty HealthKit or Health Connect status as not determined", () => {
    expect(interpretStepAuthorization({ readAuthorized: [], readDenied: [] })).toBeNull();
  });
});

describe("step read window", () => {
  it("ends at the next local midnight so today is inside an exclusive range", () => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const now = new Date(2026, 8, 27, 15, 0, 0);
    const range = stepReadWindow(now, timeZone);
    expect(range.startKey).toBe("2026-09-21");
    expect(localDateKeyFromIso(range.endIso, timeZone)).toBe("2026-09-28");
    expect(range.endIso > now.toISOString()).toBe(true);
  });

  it("uses daily totals when they exist and raw samples only as a fallback", () => {
    expect(
      pickStepSamples(
        [{ startDate: "2026-09-27T00:00:00.000Z", value: 0, values: { sum: 4200 } }],
        [{ startDate: "2026-09-27T08:00:00.000Z", value: 100 }],
      ),
    ).toEqual([{ startDate: "2026-09-27T00:00:00.000Z", value: 4200 }]);

    expect(
      pickStepSamples([], [{ startDate: "2026-09-27T08:00:00.000Z", value: 1800 }]),
    ).toEqual([{ startDate: "2026-09-27T08:00:00.000Z", value: 1800 }]);
  });
});
