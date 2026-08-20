import { describe, expect, it } from "vitest";
import { ensureMayaAnalyticsSavedAck } from "@/lib/kaios/maya/analytics-ack";

describe("ensureMayaAnalyticsSavedAck", () => {
  it("names the analytics write after a meal save", () => {
    expect(
      ensureMayaAnalyticsSavedAck({
        text: "Afiyet olsun.",
        locale: "tr",
        coachId: "maya",
        mealSaved: true,
      }),
    ).toContain("analize");
  });

  it("skips other coaches", () => {
    expect(
      ensureMayaAnalyticsSavedAck({
        text: "Afiyet olsun.",
        locale: "tr",
        coachId: "kai",
        mealSaved: true,
      }),
    ).toBe("Afiyet olsun.");
  });
});
