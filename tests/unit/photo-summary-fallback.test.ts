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

  it("replaces an English physique essay when the account language is Turkish", () => {
    const essay =
      "What I can see: chest, shoulders, arms and core are all visible here. Scores as observed are higher than last time because the light changed, and that jump almost never reflects real tissue.";
    const out = resolvePhotoCoachSummary({
      summary: essay,
      locale: "tr",
      coachId: "leo",
      kind: "body",
      analysis: {
        visible_muscles: ["chests", "shoulders"],
        scores: { chests: 60, shoulders: 65 },
        overall_score: 58,
        food_analysis: null,
        ambiguity: [],
      },
    });
    expect(out).toMatch(/Görünen bölgeler|genel skor/i);
    expect(out).not.toMatch(/what i can see/i);
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
