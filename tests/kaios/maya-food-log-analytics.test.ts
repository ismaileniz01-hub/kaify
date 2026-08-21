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

  it("parses compact kcal · P · C · F lines", () => {
    expect(
      extractMealMacrosFromCoachText("Sütlaç ≈ 280 kcal · 4g protein · 48g carbs · 8g fat"),
    ).toEqual({ calories: 280, protein: 4, carbs: 48, fat: 8 });
  });

  it("parses a totals line when per-item kcal is listed first", () => {
    const text = `Tavuk tava (1 porsiyon): ~350-400 kcal, 30-35g protein
Çiğköfte (1 porsiyon): ~250-300 kcal, 8-10g protein
Toplam tahmini: ~1400-1600 kcal, 55-65g protein`;
    const parsed = extractMealMacrosFromCoachText(text);
    expect(parsed?.calories).toBe(1500);
    expect(parsed?.protein).toBe(60);
    expect(parsed?.carbs).toBeGreaterThan(0);
    expect(parsed?.fat).toBeGreaterThan(0);
  });

  it("fills carbs/fat when Maya only listed calories and protein", () => {
    const parsed = extractMealMacrosFromCoachText(
      "Kalori: 650 kcal Protein: 40g. Analize eklememi onaylıyor musun?",
    );
    expect(parsed?.calories).toBe(650);
    expect(parsed?.protein).toBe(40);
    expect(parsed?.carbs).toBeGreaterThan(0);
    expect(parsed?.fat).toBeGreaterThan(0);
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

  it("queues confirmation when the user pastes the macro estimate", () => {
    expect(
      macrosForMayaFoodLogConfirm({
        coach: "maya",
        userMessage:
          "Tavuk tava (1 porsiyon): ~350-400 kcal, 30-35g protein - Çiğköfte: ~250-300 kcal, 8-10g protein Toplam tahmini: ~1400-1600 kcal, 55-65g protein",
        assistantText: "Salut, je vois une liste.",
      }),
    ).toMatchObject({ calories: 1500, protein: 60 });
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

  it("reads food_analysis envelopes that use carb singular", () => {
    expect(
      macrosForMayaFoodLogConfirm({
        coach: "maya",
        userMessage: "bunu yedim",
        assistantText: "Afiyet.",
        envelopeData: {
          food_analysis: { calories: 280, protein: 4, carb: 48, fat: 8 },
        },
      }),
    ).toEqual({ calories: 280, protein: 4, carbs: 48, fat: 8 });
  });
});
