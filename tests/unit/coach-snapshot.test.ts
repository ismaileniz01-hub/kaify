import { describe, expect, it } from "vitest";
import {
  extractAlexPlanFocus,
  extractPhysiqueFromLeoPayload,
  formatNutritionSnapshot,
  summarizePhysiqueScores,
} from "@/lib/kaios/context/coach-snapshot";

describe("summarizePhysiqueScores", () => {
  it("marks lowest groups as lagging when spread is real", () => {
    const summary = summarizePhysiqueScores(
      { chests: 72, back: 48, calves: 44, shoulders: 70, biceps: 68 },
      64,
    );
    expect(summary.lagging).toEqual(["calves", "back"]);
    expect(summary.priority).toBe("calves");
    expect(summary.compact).toContain("leo_lagging: calves,back");
    expect(summary.compact).toContain("leo_overall: 64");
    expect(summary.compact).toContain("leo_priority: calves");
  });

  it("does not invent lagging when scores are balanced", () => {
    const summary = summarizePhysiqueScores(
      { chests: 70, back: 68, shoulders: 71 },
      70,
    );
    expect(summary.lagging).toEqual([]);
    expect(summary.compact).toContain("leo_overall: 70");
    expect(summary.compact).not.toContain("leo_lagging");
  });
});

describe("extractPhysiqueFromLeoPayload", () => {
  it("reads nested analysis.scores from Leo chat payloads", () => {
    const summary = extractPhysiqueFromLeoPayload({
      analysis: {
        scores: { back: 42, chests: 78, calves: 50 },
        overall_score: 60,
      },
    });
    expect(summary?.lagging).toContain("back");
    expect(summary?.compact).toContain("leo_overall: 60");
  });
});

describe("formatNutritionSnapshot", () => {
  it("serializes goals and today's progress for Maya/Kai", () => {
    const line = formatNutritionSnapshot({
      calorieGoal: 2100,
      proteinGoalG: 150,
      caloriesConsumed: 900,
      proteinG: 80,
    });
    expect(line).toContain("calorie_goal: 2100");
    expect(line).toContain("protein_goal_g: 150");
    expect(line).toContain("calories_today: 900/2100");
    expect(line).toContain("protein_today_g: 80/150");
  });
});

describe("extractAlexPlanFocus", () => {
  it("compacts workout_plan day names", () => {
    expect(
      extractAlexPlanFocus({
        ui: {
          cardType: "workout_plan",
          days: [{ name: "Push" }, { name: "Pull" }, { focus: "Legs" }],
        },
      }),
    ).toBe("alex_last_plan: Push | Pull | Legs");
  });
});
