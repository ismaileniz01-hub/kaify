import { describe, expect, it } from "vitest";
import { resolveTodayJob } from "@/lib/activation/today-job";

describe("resolveTodayJob", () => {
  it("prioritizes check-in when the day is open", () => {
    expect(
      resolveTodayJob({
        checkedInToday: false,
        goalsConfigured: false,
      }).kind,
    ).toBe("check_in");
  });

  it("asks for goals after check-in", () => {
    expect(
      resolveTodayJob({
        checkedInToday: true,
        goalsConfigured: false,
      }).kind,
    ).toBe("set_goals");
  });

  it("asks for a meal photo after goals", () => {
    expect(
      resolveTodayJob({
        checkedInToday: true,
        goalsConfigured: true,
        mealLogged: false,
        workoutLogged: false,
        waterLogged: false,
      }).kind,
    ).toBe("log_meal");
  });

  it("asks for a workout after a meal is logged", () => {
    expect(
      resolveTodayJob({
        checkedInToday: true,
        goalsConfigured: true,
        mealLogged: true,
        workoutLogged: false,
        waterLogged: false,
      }),
    ).toMatchObject({ kind: "log_workout", href: "/library" });
  });

  it("asks for water last, then continues", () => {
    expect(
      resolveTodayJob({
        checkedInToday: true,
        goalsConfigured: true,
        mealLogged: true,
        workoutLogged: true,
        waterLogged: false,
      }).kind,
    ).toBe("log_water");
    expect(
      resolveTodayJob({
        checkedInToday: true,
        goalsConfigured: true,
        mealLogged: true,
        workoutLogged: true,
        waterLogged: true,
      }).kind,
    ).toBe("continue");
  });
});
