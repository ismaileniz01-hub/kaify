import { describe, expect, it } from "vitest";
import {
  fallbackPhotoSummaryFromAnalysis,
  resolvePhotoCoachSummary,
} from "@/lib/ai/photo-summary-fallback";
import { coachRetryLine } from "@/lib/kaios/coach-retry";
import type { TechnicalAnalysis } from "@/lib/validations/analysis.schema";

const meal: TechnicalAnalysis = {
  visible_muscles: [],
  scores: {},
  overall_score: 0,
  food_analysis: { calories: 650, protein: 35, carb: 70, fat: 18 },
  ambiguity: [],
};

describe("photo summary fallback", () => {
  it("builds a Maya macro line when synthesis was wiped", () => {
    const out = resolvePhotoCoachSummary({
      summary: coachRetryLine("en"),
      locale: "en",
      coachId: "maya",
      kind: "food",
      analysis: meal,
    });
    expect(out).toContain("650");
    expect(out).toContain("protein");
    expect(out).not.toBe(coachRetryLine("en"));
  });

  it("keeps a usable Maya analysis instead of replacing it", () => {
    const spoken = "Looks like chicken and rice — about 650 kcal. Want me to save it?";
    expect(
      resolvePhotoCoachSummary({
        summary: spoken,
        locale: "en",
        coachId: "maya",
        kind: "food",
        analysis: meal,
      }),
    ).toBe(spoken);
  });

  it("asks for a clearer plate when macros are missing", () => {
    expect(
      fallbackPhotoSummaryFromAnalysis(
        { ...meal, food_analysis: null, ambiguity: ["portion unclear"] },
        "en",
        "food",
      ),
    ).toMatch(/closer, brighter photo/i);
  });
});
