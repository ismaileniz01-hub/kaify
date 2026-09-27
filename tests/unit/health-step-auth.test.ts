import { describe, expect, it } from "vitest";
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
