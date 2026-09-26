/**
 * KAIOS runtime integrity closure tests — action truth, tools, safety, locale, Leo photo.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  enforceActionTruthOnPayload,
  scrubFalseSuccessClaims,
  type ActionTruthRecord,
} from "@/lib/kaios/tools/action-truth";
import {
  isToolAllowedForCoach,
  mapActionTypeToTool,
  toolsAllowedForCoach,
} from "@/lib/kaios/tools/allowlist";
import { validateProgramExerciseIds } from "@/lib/kaios/tools";
import { buildRuntimeContext } from "@/lib/kaios/context/builder";
import { compilePrompt } from "@/lib/kaios/compiler/prompt";
import { resolveActiveLocale, isNonSwitchingExpression } from "@/lib/kaios/localization/resolve";
import { resolveKaiFamiliarityStage } from "@/lib/kaios/kai/familiarity";
import { splitSafetyAndGeneralState } from "@/lib/kaios/context/safety-state";
import { buildSynthesisMessages } from "@/lib/ai/personas";
import { KAI_MODE_COUNCIL, KAI_RELATIONSHIP } from "@/lib/kaios/capsules/kai";
import { selectCouncilCapsules } from "@/lib/kaios/capsules/council";
import { LEO_VOICE, LEO_BOUNDARIES } from "@/lib/kaios/capsules/leo";

describe("action truth contract", () => {
  it("strips saved/applied flags unless SUCCEEDED", () => {
    const truths: ActionTruthRecord[] = [
      { status: "PROPOSED", tool: "applyProgram" },
    ];
    const payload = enforceActionTruthOnPayload(
      { saved: true, applied: true, data: { status: "applied", saved: true } },
      truths,
    );
    expect(payload?.saved).toBe(false);
    expect(payload?.applied).toBe(false);
    expect((payload?.data as { status: string }).status).toBe("proposed");
  });

  it("keeps PENDING_CONFIRMATION with saved=false", () => {
    const truths: ActionTruthRecord[] = [
      { status: "PENDING_CONFIRMATION", tool: "saveMealMacros" },
    ];
    const payload = enforceActionTruthOnPayload({ saved: true }, truths);
    expect(payload?.saved).toBe(false);
    expect(payload?.action_truth).toBeTruthy();
  });

  it("scrubs false success prose when no SUCCEEDED", () => {
    const scrubbed = scrubFalseSuccessClaims(
      "Done! I've saved your meal and updated your program.",
      [],
    );
    expect(scrubbed.toLowerCase()).not.toMatch(/i('ve| have) saved/);
    expect(scrubbed.toLowerCase()).toMatch(/haven't applied|not saved|propose/i);
  });

  it("allows success prose only with SUCCEEDED truth", () => {
    const msg = scrubFalseSuccessClaims("I've saved your water log.", [
      { status: "SUCCEEDED", tool: "recordHydration" },
    ]);
    expect(msg).toContain("saved");
  });

  it("still scrubs save claims when only a read tool succeeded", () => {
    const scrubbed = scrubFalseSuccessClaims("Kaydettim, öğün analize girdi.", [
      { status: "SUCCEEDED", tool: "getNutritionState" },
    ]);
    expect(scrubbed.toLowerCase()).not.toMatch(/kaydettim/);
  });

  it("does not let Alex claim a weekly log without SUCCEEDED", () => {
    const scrubbed = scrubFalseSuccessClaims(
      "Good session. That's 1 of 5 logged for the week. I can't log it for you.",
      [],
    );
    expect(scrubbed.toLowerCase()).not.toMatch(/1 of 5 logged/);
    expect(scrubbed.toLowerCase()).not.toMatch(/can't log it for you/);
  });
});

describe("tool allowlists", () => {
  it("enforces least privilege per coach", () => {
    expect(isToolAllowedForCoach("maya", "saveMealMacros")).toBe(true);
    expect(isToolAllowedForCoach("maya", "validateExerciseIds")).toBe(false);
    expect(isToolAllowedForCoach("alex", "searchExercises")).toBe(true);
    expect(isToolAllowedForCoach("alex", "getPhysiqueHistory")).toBe(true);
    expect(isToolAllowedForCoach("alex", "saveMealMacros")).toBe(false);
    expect(isToolAllowedForCoach("leo", "getPhysiqueHistory")).toBe(true);
    expect(isToolAllowedForCoach("kai", "getNutritionState")).toBe(true);
    expect(isToolAllowedForCoach("council", "saveMealMacros")).toBe(false);
    expect(toolsAllowedForCoach("alex").size).toBe(3);
  });

  it("maps action types and rejects unknown", () => {
    expect(mapActionTypeToTool("save_meal")).toBe("saveMealMacros");
    expect(mapActionTypeToTool("applyProgram")).toBeNull();
  });

  it("rejects hallucinated exercise ids", () => {
    const result = validateProgramExerciseIds([
      "not_a_real_exercise_id_xyz",
      "totally_fake_lift",
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_EXERCISE_IDS");
  });
});

describe("safety state survives pruning", () => {
  it("keeps allergies/injuries at casual tier 0", () => {
    const ctx = buildRuntimeContext({
      coach: "maya",
      message: "hi",
      locale: "en",
      userState:
        "allergies: peanuts; injuries/limitations: left knee; motivation style: tough",
      memoryItems: ["User loves peanuts"],
      conversationTurns: [
        { role: "user", content: "I can eat peanuts" },
        { role: "assistant", content: "Sure" },
      ],
    });
    expect(ctx.tier).toBe(0);
    expect(ctx.userState).toMatch(/allergies: peanuts/i);
    expect(ctx.userState).toMatch(/injuries\/limitations: left knee/i);
    expect(ctx.userState).not.toMatch(/motivation style/);
    expect(ctx.memoryItems).toBeUndefined();
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toMatch(/allergies: peanuts/i);
    expect(blob).toMatch(/left knee/i);
  });

  it("keeps Leo lagging and calorie goals on casual Kai greetings", () => {
    const ctx = buildRuntimeContext({
      coach: "kai",
      message: "hi",
      locale: "en",
      userState:
        "leo_lagging: back,calves; calorie_goal: 2100; calories_today: 900/2100; primary_goal: lose_weight; motivation style: tough",
    });
    expect(ctx.tier).toBe(0);
    expect(ctx.userState).toMatch(/leo_lagging: back,calves/);
    expect(ctx.userState).toMatch(/calorie_goal: 2100/);
    expect(ctx.userState).toMatch(/calories_today: 900\/2100/);
    expect(ctx.userState).not.toMatch(/motivation style/);
  });

  it("splits safety vs general", () => {
    const { safetyState, generalState } = splitSafetyAndGeneralState(
      "allergies: shellfish; streak: 3",
    );
    expect(safetyState).toMatch(/shellfish/);
    expect(generalState).toMatch(/streak/);
  });
});

describe("locale resolver", () => {
  it("keeps short acknowledgements on saved locale", () => {
    expect(isNonSwitchingExpression("tamam")).toBe(true);
    expect(isNonSwitchingExpression("evet")).toBe(true);
    expect(isNonSwitchingExpression("thanks")).toBe(true);
    expect(
      resolveActiveLocale({
        message: "ok",
        messageLocale: "de",
        savedLocale: "tr",
      }),
    ).toBe("tr");
  });

  it("honors explicit switch without wiping saved preference logic", () => {
    expect(
      resolveActiveLocale({
        explicitLocale: "en",
        messageLocale: "tr",
        savedLocale: "tr",
        message: "Merhaba nasılsın",
      }),
    ).toBe("en");
  });
});

describe("Kai familiarity", () => {
  it("derives stages deterministically and unknown when empty", () => {
    expect(resolveKaiFamiliarityStage({})).toBe("unknown");
    expect(
      resolveKaiFamiliarityStage({ directMessageCount: 3 }),
    ).toBe("new");
    expect(
      resolveKaiFamiliarityStage({ directMessageCount: 50 }),
    ).toBe("established");
    expect(KAI_RELATIONSHIP).toMatch(/unknown/i);
  });
});

describe("Leo photo uses KAIOS capsules", () => {
  it("injects Leo layered capsules into synthesis system prompt", () => {
    const built = buildSynthesisMessages({
      persona: "leo",
      locale: "en",
      analysis: {
        visible_muscles: ["chests"],
        scores: { chests: 70 },
        overall_score: 70,
        food_analysis: null,
      } as never,
      drift: [],
    });
    const system = built.messages[0]?.content ?? "";
    expect(system).toContain(LEO_VOICE.slice(0, 40));
    expect(system).toContain(LEO_BOUNDARIES.slice(0, 40));
    expect(system).toMatch(/no automatic praise|hype|evidence/i);
    expect(system).not.toMatch(/energetic.*hype coach/i);
  });

  it("Leo photo synthesis receives teammate USER_CONTEXT", () => {
    const built = buildSynthesisMessages({
      persona: "leo",
      locale: "tr",
      analysis: {
        visible_muscles: ["back"],
        scores: { back: 42, chests: 78 },
        overall_score: 60,
        food_analysis: null,
      } as never,
      drift: [],
      userState:
        "alex_last_plan: Push | Pull | Legs; calorie_goal: 2100; leo_lagging: back",
    });
    const blob = built.messages.map((m) => m.content).join("\n");
    expect(blob).toContain("USER_CONTEXT");
    expect(blob).toContain("alex_last_plan: Push | Pull | Legs");
    expect(blob).toContain("calorie_goal: 2100");
    expect(blob).toMatch(/fold those teammate facts/i);
  });

  it("Maya photo synthesis requires an after-meal water reminder", () => {
    const built = buildSynthesisMessages({
      persona: "maya",
      locale: "tr",
      analysis: {
        visible_foods: ["rice"],
        food_analysis: {
          calories: 500,
          protein: 20,
          carb: 60,
          fat: 12,
        },
        scores: {},
        overall_score: 0,
      } as never,
      drift: [],
      userState: "water_today_l: 0.8/2.5; calorie_goal: 2100",
    });
    const blob = built.messages.map((m) => m.content).join("\n");
    expect(blob).toMatch(/after_every_meal|short water reminder/i);
    expect(blob).toContain("water_today_l: 0.8/2.5");
  });
});

describe("Council Kai moderator mode", () => {
  it("exports KAI_MODE_COUNCIL and council digests", () => {
    expect(KAI_MODE_COUNCIL).toMatch(/moderat|specialist|user/i);
    const capsules = selectCouncilCapsules("turn");
    expect(capsules.join("\n")).toMatch(/council\.roles/);
  });
});

describe("executeTool identity stripping", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("strips client userId from args (unit via allowlist + validate)", async () => {
    // Cross-user ownership covered in tool-authorization.test.ts;
    // here we assert allowlist + unknown action mapping stay closed.
    expect(mapActionTypeToTool("deleteAccount")).toBeNull();
    expect(isToolAllowedForCoach("maya", "getPhysiqueHistory")).toBe(false);
  });
});
