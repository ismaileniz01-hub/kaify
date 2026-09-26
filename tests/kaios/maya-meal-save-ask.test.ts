import { describe, expect, it } from "vitest";
import {
  ensureMayaMealSaveAsk,
  mealSaveAsk,
  shouldAskMayaMealSave,
} from "@/lib/kaios/maya/meal-save-ask";

describe("ensureMayaMealSaveAsk", () => {
  it("appends a Turkish save ask after a food log if Maya forgot", () => {
    const out = ensureMayaMealSaveAsk({
      text: "Kalori 650, protein 28g.",
      locale: "tr",
      coachId: "maya",
      intent: "nutrition_question",
      userMessage: "lahmacun yedim",
    });
    expect(out).toContain("Kalori 650");
    expect(out).toContain(mealSaveAsk("tr"));
  });

  it("does not duplicate when Maya already asked", () => {
    const text = "Güzel tabak. Kalori 500. Analize eklememi onaylıyor musun?";
    const out = ensureMayaMealSaveAsk({
      text,
      locale: "tr",
      coachId: "maya",
      userMessage: "döner gomdum",
    });
    expect(out).toBe(text);
  });

  it("asks after meal photo analysis even without eat-slang", () => {
    const out = ensureMayaMealSaveAsk({
      text: "Looks like grilled chicken and rice.",
      locale: "en",
      coachId: "maya",
      intent: "meal_analysis",
      userMessage: "what is this",
    });
    expect(out).toContain(mealSaveAsk("en"));
  });

  it("does not ask Alex", () => {
    expect(
      shouldAskMayaMealSave({
        coachId: "alex",
        userMessage: "lahmacun yedim",
      }),
    ).toBe(false);
  });
});
