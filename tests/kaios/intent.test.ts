import { describe, expect, it } from "vitest";
import {
  needsStructuredOutput,
  outputBudgetFor,
  resolveIntent,
} from "@/lib/kaios/routing/intent";

describe("resolveIntent", () => {
  it("routes short greetings to casual for kai", () => {
    expect(
      resolveIntent({ coach: "kai", message: "Selam, nasılsın?" }),
    ).toBe("casual");
    expect(resolveIntent({ coach: "kai", message: "hey" })).toBe("casual");
  });

  it("routes motivation cues for kai", () => {
    expect(
      resolveIntent({ coach: "kai", message: "Bugün salona gidesim yok." }),
    ).toBe("motivation");
    expect(
      resolveIntent({
        coach: "kai",
        message: "I'm tired and don't want to go to the gym",
      }),
    ).toBe("motivation");
  });

  it("routes form / programming for alex", () => {
    expect(
      resolveIntent({
        coach: "alex",
        message: "How do I squat with good form?",
      }),
    ).toBe("exercise_form");
    expect(
      resolveIntent({
        coach: "alex",
        message: "Can you build me a 4-day workout program?",
      }),
    ).toBe("programming");
  });

  it("routes nutrition and meal analysis for maya", () => {
    expect(
      resolveIntent({
        coach: "maya",
        message: "How much protein should I eat?",
      }),
    ).toBe("nutrition_question");
    expect(
      resolveIntent({
        coach: "maya",
        message: "What is on my plate?",
        hasImage: true,
      }),
    ).toBe("meal_analysis");
    expect(
      resolveIntent({
        coach: "maya",
        message: "Make me a weekly meal plan",
      }),
    ).toBe("meal_plan");
  });

  it("respects workflow/route overrides for council", () => {
    expect(
      resolveIntent({
        coach: "council",
        message: "What should we do this week?",
      }),
    ).toBe("council_turn");
    expect(
      resolveIntent({
        coach: "kai",
        message: "Finalize the plan",
        workflow: "council_decision",
      }),
    ).toBe("council_decision");
  });
});

describe("needsStructuredOutput / outputBudgetFor", () => {
  it("flags analysis and plan intents as structured", () => {
    expect(needsStructuredOutput("meal_analysis")).toBe(true);
    expect(needsStructuredOutput("programming")).toBe(true);
    expect(needsStructuredOutput("casual")).toBe(false);
    expect(needsStructuredOutput("motivation")).toBe(false);
  });

  it("maps budgets to casual/quick/standard/detailed/deep bands", () => {
    expect(outputBudgetFor("casual")).toBe(80);
    expect(outputBudgetFor("motivation")).toBe(140);
    expect(outputBudgetFor("nutrition_question")).toBe(220);
    expect(outputBudgetFor("meal_plan")).toBe(400);
    expect(outputBudgetFor("meal_analysis")).toBe(650);
  });
});
