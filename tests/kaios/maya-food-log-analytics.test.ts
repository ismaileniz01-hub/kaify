import { describe, expect, it } from "vitest";
import { extractMealMacrosFromCoachText } from "@/lib/kaios/nutrition/parse-macros";
import { macrosForMayaFoodLogConfirm } from "@/lib/kaios/tools/dispatch";

const DONER_REPLY = `Afiyet olsun. 😋
Kalori: ~600-700 kcal
Protein: ~35-40g
Karbonhidrat: ~60-70g
Yağ: ~25-30g
Malzemeleri söylersen daha net hesaplarım.`;

describe("extractMealMacrosFromCoachText", () => {
  it("parses Turkish labeled ranges from a Maya food-log reply", () => {
    expect(extractMealMacrosFromCoachText(DONER_REPLY)).toEqual({
      calories: 650,
      protein: 38,
      carbs: 65,
      fat: 28,
    });
  });

  it("parses Croatian labeled macros from a drifted Maya reply", () => {
    expect(
      extractMealMacrosFromCoachText(
        "Jasno, rižin puding! Kalorije: 280 Proteini: 4 Ugljikohidrati: 48 Masti: 8",
      ),
    ).toEqual({ calories: 280, protein: 4, carbs: 48, fat: 8 });
  });

  it("parses English labeled macros", () => {
    expect(
      extractMealMacrosFromCoachText(
        "Calories: 520 kcal. Protein 32g, carbs 48g, fat 18g.",
      ),
    ).toEqual({ calories: 520, protein: 32, carbs: 48, fat: 18 });
  });

  it("does not treat a protein target as a meal", () => {
    expect(
      extractMealMacrosFromCoachText(
        "Aim for about 150g protein a day. Stay consistent.",
      ),
    ).toBeNull();
  });
});

describe("macrosForMayaFoodLogConfirm", () => {
  it("queues confirmation when the user logged food and Maya listed macros", () => {
    expect(
      macrosForMayaFoodLogConfirm({
        coach: "maya",
        userMessage: "1 hatay doner gomdum",
        assistantText: DONER_REPLY,
      }),
    ).toEqual({ calories: 650, protein: 38, carbs: 65, fat: 28 });
  });

  it("skips general nutrition questions without a food log", () => {
    expect(
      macrosForMayaFoodLogConfirm({
        coach: "maya",
        userMessage: "How much protein should I eat?",
        assistantText:
          "Kalori: 1800 kcal Protein: 140g Karbonhidrat: 180g Yağ: 60g",
      }),
    ).toBeNull();
  });

  it("skips other coaches", () => {
    expect(
      macrosForMayaFoodLogConfirm({
        coach: "kai",
        userMessage: "1 hatay doner gomdum",
        assistantText: DONER_REPLY,
      }),
    ).toBeNull();
  });

  it("skips when a confirmation is already pending", () => {
    expect(
      macrosForMayaFoodLogConfirm({
        coach: "maya",
        userMessage: "I ate a burger",
        assistantText: DONER_REPLY,
        alreadyConfirming: true,
      }),
    ).toBeNull();
  });

  it("queues sütlaç logs and envelope macros when speech labels are missing", () => {
    expect(
      macrosForMayaFoodLogConfirm({
        coach: "maya",
        userMessage: "bir sutlac yedim",
        assistantText: "Afiyet olsun, tatlı bir tercih.",
        envelopeData: { calories: 280, protein: 4, carbohydrates: 48, fat: 8 },
      }),
    ).toEqual({ calories: 280, protein: 4, carbs: 48, fat: 8 });
  });
});
