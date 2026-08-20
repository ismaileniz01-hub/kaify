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
  MAYA_FOOD_LOG,
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
/** Per-layer budget; joined *\_CORE aliases may be larger. */
const MAX_LAYER_CHARS = 2500;
const MAX_JOINED_CORE_CHARS = 4500;

const JOINED_CORE_NAMES = new Set([
  "ALEX_CORE",
  "MAYA_CORE",
  "LEO_CORE",
  "KAI_CORE",
]);

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
  ["MAYA_FOOD_LOG", MAYA_FOOD_LOG],
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

  it("keeps capsules compact (layers ≤2500, joined cores ≤4500)", () => {
    for (const [name, value] of ALL_CAPSULES) {
      const limit = JOINED_CORE_NAMES.has(name)
        ? MAX_JOINED_CORE_CHARS
        : MAX_LAYER_CHARS;
      expect(value.length, `${name} is ${value.length} chars`).toBeLessThanOrEqual(
        limit,
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
    expect(alex.join("\n\n")).toContain(ALEX_CORE);
    expect(alex).toContain(ALEX_FORM);
    expect(alex.some((c) => c.includes("locale.en"))).toBe(true);

    const maya = loadCoachCapsules("maya", "food_analysis");
    expect(maya).toContain(MAYA_FOOD_ANALYSIS);
    expect(maya).toContain(MAYA_HYDRATION);

    const mayaLog = loadCoachCapsules("maya", "food_log");
    expect(mayaLog).toContain(MAYA_FOOD_LOG);
    expect(mayaLog).toContain(MAYA_HYDRATION);
    expect(mayaLog).not.toContain(MAYA_FOOD_ANALYSIS);
    expect(mayaLog).not.toContain(MAYA_MEAL_PLANNING);

    const leo = loadCoachCapsules("leo", "scoring");
    expect(leo).toContain(LEO_SCORING);
    expect(leo.join("\n")).toMatch(/analytical|objective/i);

    const kai = loadCoachCapsules("kai", "motivation");
    expect(kai).toContain(KAI_MOTIVATION);

    const council = loadCoachCapsules("council", "turn");
    expect(council).toContain(COUNCIL_CORE);
    expect(council.join("\n")).toMatch(/council\.roles|alex:.*training/i);
  });

  it("preserves critical coach rules from source-recommended runtime YAML", () => {
    expect(ALEX_CORE).toContain("never_invent_exercise_ids");
    expect(MAYA_CORE).toContain("never_claim_save_without_tool_success");
    expect(MAYA_CORE).toContain("photo_vision_identifies_food_not_final_macros");
    expect(MAYA_CORE).toContain("after_every_meal");
    expect(MAYA_FOOD_LOG).toContain("after_every_meal");
    expect(LEO_CORE).toContain("validate_image_before_scoring");
    expect(LEO_CORE).toContain("do_not_inflate_scores_for_motivation");
    expect(KAI_CORE).toMatch(/never_fake_product_actions|do_not_invent_product_actions/i);
    expect(COUNCIL_CORE).toContain("user_is_participant");
    expect(COUNCIL_CORE).toContain("do_not_generate_past_user_turn");
    expect(LOCALIZATION_CAPSULE).toContain("short_expressions_do_not_switch");
    expect(CORE_CAPSULE).toContain("do not re-ask fields already present");
    expect(CORE_CAPSULE).toContain("teammate product facts");
    expect(CORE_CAPSULE).toContain("exposing_error_codes_or_internal_labels");
    expect(SAFETY_CAPSULE).toContain("never output error codes");
    expect(ALEX_PROGRAMMING).toContain("trusted_onboarding");
    expect(ALEX_PROGRAMMING).toContain("never interview for those again");
    expect(ALEX_PROGRAMMING).toContain("spoken_program");
    expect(ALEX_PROGRAMMING).toContain("leo_lagging");
    expect(ALEX_PROGRAMMING).toContain("maya_fuel");
    expect(ALEX_CORE).toContain("teammate_work");
    expect(MAYA_MEAL_PLANNING).toContain("calorie_goal");
    expect(MAYA_MEAL_PLANNING).toContain("alex_last_plan");
    expect(MAYA_CORE).toContain("teammate_work");
    expect(LEO_CORE).toContain("teammate_work");
    expect(KAI_CORE).toContain("teammate_read");
    expect(COUNCIL_CORE).toContain("WEEKLY_SNAPSHOT");
    expect(COUNCIL_CORE).toContain("same snapshot");
  });

  it("getLocalePack returns a short pack", () => {
    expect(getLocalePack("tr").length).toBeGreaterThan(10);
    expect(getLocalePack("tr").length).toBeLessThan(400);
    expect(getLocalePack("zz-unknown").length).toBeGreaterThan(10);
  });
});
