import { describe, expect, it } from "vitest";
import {
  extractAlexPlanFocus,
  extractPhysiqueFromLeoPayload,
  formatNutritionSnapshot,
  pickAlexPlanFocus,
  prioritizeTeamFactLines,
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
      waterLiters: 0.8,
      waterGoalLiters: 2.5,
    });
    expect(line).toContain("calorie_goal: 2100");
    expect(line).toContain("protein_goal_g: 150");
    expect(line).toContain("calories_today: 900/2100");
    expect(line).toContain("protein_today_g: 80/150");
    expect(line).toContain("water_today_l: 0.8/2.5");
  });

  it("includes zero water today so Maya can still remind", () => {
    const line = formatNutritionSnapshot({
      waterLiters: 0,
      waterGoalLiters: 2.5,
    });
    expect(line).toContain("water_today_l: 0/2.5");
  });
});

describe("extractAlexPlanFocus", () => {
  it("compacts workout_plan day names", () => {
    expect(
      extractAlexPlanFocus({
        ui: {
          cardType: "workout_plan",
          days: [
            { name: "Push", exercises: [{ name: "Bench Press" }] },
            { name: "Pull", exercises: [{ name: "Barbell Row" }] },
            { focus: "Legs", exercises: [{ name: "Squat" }] },
          ],
        },
      }),
    ).toBe("alex_last_plan: Push | Pull | Legs");
  });

  it("ignores stub days that only have labels", () => {
    expect(
      extractAlexPlanFocus({
        ui: {
          cardType: "workout_plan",
          days: [{ name: "Push" }, { name: "Pull" }, { focus: "Legs" }],
        },
      }),
    ).toBeNull();
  });

  it("skips empty workout_plan rows so a later real plan wins", () => {
    expect(
      pickAlexPlanFocus([
        { payload: { ui: { cardType: "workout_plan", days: [] } } },
        {
          payload: {
            ui: {
              cardType: "workout_plan",
              days: [
                { name: "Push", exercises: [{ name: "Bench Press" }] },
                { name: "Pull", exercises: [{ name: "Row" }] },
              ],
            },
          },
        },
      ]),
    ).toBe("alex_last_plan: Push | Pull");
  });

  it("reads production dayKey/focusKey payloads, including i18n keys", () => {
    expect(
      extractAlexPlanFocus({
        ui: {
          cardType: "workout_plan",
          days: [
            {
              dayKey: "workout.day1",
              focusKey: "workout.chest_triceps",
              exercises: [{ name: "Bench Press" }],
            },
            {
              dayKey: "workout.day2",
              focusKey: "workout.back_biceps",
              exercises: [{ name: "Row" }],
            },
            {
              dayKey: "Pazartesi",
              focusKey: "Pull",
              exercises: [{ name: "Pulldown" }],
            },
          ],
        },
      }),
    ).toBe("alex_last_plan: chest triceps | back biceps | Pull");
  });

  it("reads days nested under data when ui only has cardType", () => {
    expect(
      extractAlexPlanFocus({
        ui: { cardType: "workout_plan" },
        data: {
          days: [
            { focusKey: "Push", exercises: [{ name: "Bench Press" }] },
            { focusKey: "Legs", exercises: [{ name: "Squat" }] },
          ],
        },
      }),
    ).toBe("alex_last_plan: Push | Legs");
  });

  it("reads a spoken Alex program saved as text", () => {
    expect(
      pickAlexPlanFocus([
        {
          content:
            "Pazartesi - Push\n- Bench Press 4x8\nSalı - Pull\n- Barbell Row 4x10",
        },
      ]),
    ).toBe("alex_last_plan: Push | Pull");
  });
});

describe("prioritizeTeamFactLines", () => {
  it("keeps Leo and Alex facts when nutrition extras would overflow the budget", () => {
    const snapshot = [
      "calorie_goal: 2100",
      "protein_goal_g: 150",
      "carbs_goal_g: 200",
      "fat_goal_g: 70",
      "calories_today: 900/2100",
      "protein_today_g: 80/150",
      "water_today_l: 0.8/2.5",
      "leo_lagging: back,calves",
      "alex_last_plan: Push | Pull | Legs",
    ].join("; ");
    const lines = prioritizeTeamFactLines(snapshot, 8);
    expect(lines.join(" ")).toContain("leo_lagging: back,calves");
    expect(lines.join(" ")).toContain("alex_last_plan: Push | Pull | Legs");
    expect(lines.join(" ")).toContain("water_today_l: 0.8/2.5");
    expect(lines.length).toBeLessThanOrEqual(8);
  });
});
