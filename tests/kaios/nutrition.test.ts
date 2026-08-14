import { describe, expect, it } from "vitest";
import {
  getNutritionProvider,
  hasObservationMacros,
  macrosFromObservationEstimate,
} from "@/lib/kaios/nutrition";
import { ModelEstimateProvider } from "@/lib/kaios/nutrition/model-estimate-provider";

describe("KAIOS nutrition provider", () => {
  it("getNutritionProvider returns model-estimate provider (no catalog)", () => {
    const provider = getNutritionProvider();
    expect(provider).toBeInstanceOf(ModelEstimateProvider);
  });

  it("lookupComposition returns null without inventing tables", async () => {
    const provider = getNutritionProvider();
    const composition = await provider.lookupComposition({
      identity: "chicken breast",
      portion: 150,
      portionUnit: "g",
    });
    expect(composition).toBeNull();
  });

  it("resolveMacros tags observation macros as model_estimate", async () => {
    const provider = getNutritionProvider();
    const result = await provider.resolveMacros({
      identity: "oatmeal bowl",
      calories: 420,
      protein: 18,
      carbohydrates: 55,
      fat: 12,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.macros.provenance).toBe("model_estimate");
      expect(result.macros.calories).toBe(420);
      expect(result.macros.protein).toBe(18);
      expect(result.macros.carbohydrates).toBe(55);
      expect(result.macros.fat).toBe(12);
      expect(result.macros.scaled).toBeUndefined();
    }
  });

  it("resolveMacros fails honestly when no macros on observation", async () => {
    const provider = getNutritionProvider();
    const result = await provider.resolveMacros({
      identity: "mystery plate",
      ambiguity: ["sauce unknown"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no_macros");
    }
  });

  it("never labels model_estimate helpers as catalog", () => {
    const macros = macrosFromObservationEstimate({
      calories: 100,
      protein: 10,
      carbohydrates: 10,
      fat: 4,
    });
    expect(macros?.provenance).toBe("model_estimate");
    expect(hasObservationMacros({ calories: 1, protein: 1, carbohydrates: 1, fat: 1 })).toBe(
      true,
    );
    expect(hasObservationMacros({ identity: "x" })).toBe(false);
  });
});
