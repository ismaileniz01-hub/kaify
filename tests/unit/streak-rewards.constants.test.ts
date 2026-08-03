import { describe, expect, it } from "vitest";
import {
  buildStreakRewardClaims,
  MILESTONE_GEM_REWARD,
  SPECIAL_STATION_DAY,
  SPECIAL_STATION_GEM_REWARD,
  STATION_GEM_REWARD,
  STREAK_MILESTONES,
} from "@/lib/streak-rewards.constants";

describe("streak reward constants", () => {
  it("builds no claims for zero streak", () => {
    expect(buildStreakRewardClaims(0)).toEqual([]);
  });

  it("includes milestones and stations up to streak", () => {
    const claims = buildStreakRewardClaims(7);
    expect(claims.some((c) => c.claimKey === "milestone:7")).toBe(true);
    expect(claims.filter((c) => c.claimKey.startsWith("station:")).length).toBe(7);
    expect(claims.find((c) => c.claimKey === "milestone:7")?.amount).toBe(
      MILESTONE_GEM_REWARD,
    );
  });

  it("uses special station reward on day 90", () => {
    const claims = buildStreakRewardClaims(SPECIAL_STATION_DAY);
    const special = claims.find((c) => c.claimKey === `station:${SPECIAL_STATION_DAY}`);
    expect(special?.amount).toBe(SPECIAL_STATION_GEM_REWARD);
    expect(
      claims.find((c) => c.claimKey === "station:1")?.amount,
    ).toBe(STATION_GEM_REWARD);
  });

  it("keeps milestones aligned with road segments", () => {
    expect([...STREAK_MILESTONES]).toEqual([7, 31, 61, 120]);
  });
});
