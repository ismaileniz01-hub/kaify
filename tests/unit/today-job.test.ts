import { describe, expect, it } from "vitest";
import { resolveTodayJob } from "@/lib/activation/today-job";

describe("resolveTodayJob", () => {
  it("prioritizes check-in when the day is open", () => {
    expect(
      resolveTodayJob({
        checkedInToday: false,
        goalsConfigured: false,
        streakAtRisk: false,
      }).kind,
    ).toBe("check_in");
  });

  it("asks for goals after check-in", () => {
    expect(
      resolveTodayJob({
        checkedInToday: true,
        goalsConfigured: false,
        streakAtRisk: false,
      }).kind,
    ).toBe("set_goals");
  });

  it("routes to Kai once habits are set", () => {
    expect(
      resolveTodayJob({
        checkedInToday: true,
        goalsConfigured: true,
        streakAtRisk: false,
      }).kind,
    ).toBe("chat_kai");
  });
});
