import { describe, expect, it } from "vitest";
import {
  CORE_CAPSULE,
  SAFETY_CAPSULE,
  LOCALIZATION_CAPSULE,
  ALEX_CORE,
  ALEX_FORM,
  ALEX_PROGRAMMING,
  ALEX_MOTIVATION,
  ALEX_SAFETY,
  MAYA_CORE,
  MAYA_FOOD_ANALYSIS,
  MAYA_MEAL_PLANNING,
  MAYA_HYDRATION,
  MAYA_SAFETY,
  LEO_CORE,
  LEO_IMAGE_QUALITY,
  LEO_SCORING,
  LEO_TREND,
  LEO_POSTURE,
  KAI_CORE,
  KAI_MOTIVATION,
  KAI_EMOTIONAL,
  KAI_CELEBRATION,
  COUNCIL_CORE,
  loadCoachCapsules,
  getLocalePack,
} from "@/lib/kaios/capsules";

const FORBIDDEN_TITLE = "Kaify AI Operating System —";
const MAX_CHARS = 2500;

const ALL_CAPSULES: Array<[string, string]> = [
  ["CORE_CAPSULE", CORE_CAPSULE],
  ["SAFETY_CAPSULE", SAFETY_CAPSULE],
  ["LOCALIZATION_CAPSULE", LOCALIZATION_CAPSULE],
  ["ALEX_CORE", ALEX_CORE],
  ["ALEX_FORM", ALEX_FORM],
  ["ALEX_PROGRAMMING", ALEX_PROGRAMMING],
  ["ALEX_MOTIVATION", ALEX_MOTIVATION],
  ["ALEX_SAFETY", ALEX_SAFETY],
  ["MAYA_CORE", MAYA_CORE],
  ["MAYA_FOOD_ANALYSIS", MAYA_FOOD_ANALYSIS],
  ["MAYA_MEAL_PLANNING", MAYA_MEAL_PLANNING],
  ["MAYA_HYDRATION", MAYA_HYDRATION],
  ["MAYA_SAFETY", MAYA_SAFETY],
  ["LEO_CORE", LEO_CORE],
  ["LEO_IMAGE_QUALITY", LEO_IMAGE_QUALITY],
  ["LEO_SCORING", LEO_SCORING],
  ["LEO_TREND", LEO_TREND],
  ["LEO_POSTURE", LEO_POSTURE],
  ["KAI_CORE", KAI_CORE],
  ["KAI_MOTIVATION", KAI_MOTIVATION],
  ["KAI_EMOTIONAL", KAI_EMOTIONAL],
  ["KAI_CELEBRATION", KAI_CELEBRATION],
  ["COUNCIL_CORE", COUNCIL_CORE],
];

describe("KAIOS capsules", () => {
  it("exports non-empty capsules", () => {
    for (const [name, value] of ALL_CAPSULES) {
      expect(value.length, name).toBeGreaterThan(20);
    }
  });

  it("keeps each capsule under ~2500 characters", () => {
    for (const [name, value] of ALL_CAPSULES) {
      expect(value.length, `${name} is ${value.length} chars`).toBeLessThanOrEqual(
        MAX_CHARS,
      );
    }
  });

  it('does not embed full source title "Kaify AI Operating System —"', () => {
    for (const [name, value] of ALL_CAPSULES) {
      expect(value, name).not.toContain(FORBIDDEN_TITLE);
    }
  });

  it("loadCoachCapsules returns shared + coach capsules", () => {
    const alex = loadCoachCapsules("alex", "form", "en");
    expect(alex).toContain(SAFETY_CAPSULE);
    expect(alex).toContain(CORE_CAPSULE);
    expect(alex).toContain(LOCALIZATION_CAPSULE);
    expect(alex).toContain(ALEX_CORE);
    expect(alex).toContain(ALEX_FORM);
    expect(alex.some((c) => c.includes("locale.en"))).toBe(true);

    const maya = loadCoachCapsules("maya", "food_analysis");
    expect(maya).toContain(MAYA_FOOD_ANALYSIS);

    const leo = loadCoachCapsules("leo", "scoring");
    expect(leo).toContain(LEO_SCORING);
    expect(leo.join("\n")).toMatch(/analytical|objective/i);

    const kai = loadCoachCapsules("kai", "motivation");
    expect(kai).toContain(KAI_MOTIVATION);

    const council = loadCoachCapsules("council", "turn");
    expect(council).toContain(COUNCIL_CORE);
  });

  it("preserves critical coach rules from source-recommended runtime YAML", () => {
    expect(ALEX_CORE).toContain("never_invent_exercise_ids");
    expect(MAYA_CORE).toContain("never_claim_save_without_tool_success");
    expect(MAYA_CORE).toContain("photo_vision_identifies_food_not_final_macros");
    expect(LEO_CORE).toContain("validate_image_before_scoring");
    expect(LEO_CORE).toContain("do_not_inflate_scores_for_motivation");
    expect(KAI_CORE).toContain("do_not_invent_product_actions_or_dragon_features");
    expect(COUNCIL_CORE).toContain("user_is_participant");
    expect(COUNCIL_CORE).toContain("do_not_generate_past_user_turn");
    expect(LOCALIZATION_CAPSULE).toContain("short_expressions_do_not_switch");
  });

  it("getLocalePack returns a short pack", () => {
    expect(getLocalePack("tr").length).toBeGreaterThan(10);
    expect(getLocalePack("tr").length).toBeLessThan(400);
    expect(getLocalePack("zz-unknown").length).toBeGreaterThan(10);
  });
});
