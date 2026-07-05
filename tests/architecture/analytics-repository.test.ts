import { describe, expect, it } from "vitest";
import * as readRepo from "@/lib/repositories/analytics-read.repository";
import * as writeRepo from "@/lib/repositories/analytics-write.repository";

describe("analytics repository split", () => {
  it("exports read-side query functions", () => {
    expect(typeof readRepo.readAnalyticsDailyRow).toBe("function");
    expect(typeof readRepo.readHealthStepsRange).toBe("function");
    expect(typeof readRepo.createAnalyticsReadClient).toBe("function");
  });

  it("exports write-side mutation functions", () => {
    expect(typeof writeRepo.writeAnalyticsDailyPatch).toBe("function");
    expect(typeof writeRepo.writeHealthStepsBatch).toBe("function");
    expect(typeof writeRepo.invalidateAnalyticsUserCache).toBe("function");
  });
});
