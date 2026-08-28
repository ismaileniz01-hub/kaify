import { describe, expect, it } from "vitest";
import {
  extractGeminiAnswerText,
  parseGeminiJsonText,
} from "@/lib/ai/gemini.client";
import { interpretVisionEnvelope } from "@/lib/validations/analysis.schema";

describe("extractGeminiAnswerText", () => {
  it("ignores thought parts so vision JSON stays parseable", () => {
    const text = extractGeminiAnswerText([
      { thought: true, text: "Considering lighting and plate size…" },
      {
        text: '{"quality":{"score":8,"issues":[],"tips":[]},"observations":{"visible_muscles":[],"scores":{},"overall_score":0,"food_analysis":{"calories":420,"protein":28,"carb":40,"fat":12},"ambiguity":[]}}',
      },
    ]);
    expect(JSON.parse(text).quality.score).toBe(8);
  });

  it("picks a JSON-looking part when thought flags are missing", () => {
    const text = extractGeminiAnswerText([
      { text: "rough reasoning without a flag" },
      { text: '{"quality":{"score":7,"issues":[],"tips":[]}}' },
    ]);
    expect(JSON.parse(text).quality.score).toBe(7);
  });

  it("returns empty when only thought text is present", () => {
    expect(
      extractGeminiAnswerText([{ thought: true, text: "still thinking" }]),
    ).toBe("");
  });
});

describe("parseGeminiJsonText", () => {
  it("salvages JSON wrapped in prose", () => {
    const parsed = parseGeminiJsonText(
      'Here you go\n{"quality":{"score":8,"issues":[],"tips":[]},"observations":{"visible_muscles":[],"scores":{},"overall_score":0,"food_analysis":null}}\nthanks',
    ) as { quality: { score: number } };
    expect(parsed.quality.score).toBe(8);
  });
});

describe("interpretVisionEnvelope Gemini drift", () => {
  it("accepts carbs alias and string muscle scores", () => {
    const interpreted = interpretVisionEnvelope(
      {
        quality: { score: 8, issues: [], tips: [] },
        observations: {
          visible_muscles: ["chests"],
          scores: { chests: "74" },
          overall_score: "74",
          food_analysis: {
            calories: 500,
            protein: "40",
            carbs: 55,
            fat: 18,
          },
          ambiguity: [],
        },
      },
      3,
    );
    expect(interpreted.status).toBe("VALID");
    if (interpreted.status !== "VALID") return;
    expect(interpreted.analysis.scores.chests).toBe(74);
    expect(interpreted.analysis.food_analysis?.carb).toBe(55);
  });

  it("accepts top-level food_analysis without an observations wrapper", () => {
    const interpreted = interpretVisionEnvelope(
      {
        quality: { score: 7, issues: [], tips: [] },
        food_analysis: {
          calories: 420,
          protein: 28,
          carb: 40,
          fat: 12,
        },
        visible_muscles: [],
        scores: {},
        overall_score: 0,
        ambiguity: [],
      },
      3,
    );
    expect(interpreted.status).toBe("VALID");
    if (interpreted.status !== "VALID") return;
    expect(interpreted.analysis.food_analysis?.calories).toBe(420);
  });

  it("wraps loose calories/protein on observations as food_analysis", () => {
    const interpreted = interpretVisionEnvelope(
      {
        quality: { score: 8, issues: [], tips: [] },
        observations: {
          visible_muscles: [],
          scores: {},
          overall_score: 0,
          calories: 610,
          protein: 32,
          carbs: 70,
          fat: 18,
          ambiguity: [],
        },
      },
      3,
    );
    expect(interpreted.status).toBe("VALID");
    if (interpreted.status !== "VALID") return;
    expect(interpreted.analysis.food_analysis?.calories).toBe(610);
    expect(interpreted.analysis.food_analysis?.carb).toBe(70);
  });
});
