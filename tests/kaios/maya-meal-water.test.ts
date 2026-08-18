import { describe, expect, it } from "vitest";
import {
  ensureMayaMealWaterReminder,
  mealWaterNudge,
  shouldRemindWaterAfterMeal,
} from "@/lib/kaios/maya/meal-water";

describe("ensureMayaMealWaterReminder", () => {
  it("appends a Turkish water line after a food log if Maya forgot", () => {
    const out = ensureMayaMealWaterReminder({
      text: "Kalori 650, protein 28g. Kaydetmemi ister misin?",
      locale: "tr",
      coachId: "maya",
      intent: "nutrition_question",
      userMessage: "lahmacun yedim",
    });
    expect(out).toContain("Kalori 650");
    expect(out).toContain(mealWaterNudge("tr"));
  });

  it("does not duplicate when Maya already mentioned water", () => {
    const text =
      "Güzel tabak. Kalori 500. Öğünden sonra bir bardak su içmeyi unutma.";
    const out = ensureMayaMealWaterReminder({
      text,
      locale: "tr",
      coachId: "maya",
      userMessage: "döner gomdum",
    });
    expect(out).toBe(text);
  });

  it("skips when they already logged water this turn", () => {
    const text = "Kalori 400, protein 20g.";
    const out = ensureMayaMealWaterReminder({
      text,
      locale: "tr",
      coachId: "maya",
      userMessage: "omlet yedim ve 500 ml su ictim",
    });
    expect(out).toBe(text);
  });

  it("does not nudge Alex or meal-plan-only turns", () => {
    expect(
      shouldRemindWaterAfterMeal({
        coachId: "alex",
        userMessage: "lahmacun yedim",
      }),
    ).toBe(false);
    const plan = ensureMayaMealWaterReminder({
      text: "Haftalık menü hazır.",
      locale: "tr",
      coachId: "maya",
      intent: "meal_plan",
      userMessage: "haftalik yemek programi hazirla",
    });
    expect(plan).toBe("Haftalık menü hazır.");
  });

  it("nudges meal photo analysis even without eat-slang in the caption", () => {
    const out = ensureMayaMealWaterReminder({
      text: "Looks like grilled chicken and rice.",
      locale: "en",
      coachId: "maya",
      intent: "meal_analysis",
      userMessage: "what is this",
    });
    expect(out).toContain(mealWaterNudge("en"));
  });
});
