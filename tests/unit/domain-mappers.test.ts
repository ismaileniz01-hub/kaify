import { describe, expect, it } from "vitest";
import {
  mapCheckInResult,
  mapUsageStatus,
  mapLeaderboardEntry,
} from "@/lib/types/domain.types";
import type {
  CheckInResult,
  UsageStatusResult,
  GlobalLeaderboardEntry,
} from "@/lib/types/database.types";

/**
 * Mappers are the boundary between the DB (snake_case) and the API (camelCase).
 * A dropped or mistyped field here silently corrupts what the client sees for
 * streaks, gems and quota — so every field is asserted explicitly.
 */

describe("mapCheckInResult", () => {
  it("maps every field faithfully", () => {
    const row: CheckInResult = {
      already_checked_in: false,
      current_streak: 7,
      longest_streak: 12,
      freezie_balance: 2,
      freezie_awarded: true,
      streak_dropped: false,
      streak_protected: false,
      gems_awarded: 10,
      gem_balance: 250,
      kai_unlocked_level: 3,
      kai_level_up: true,
      checked_in_date: "2026-07-03",
    };
    expect(mapCheckInResult(row)).toEqual({
      alreadyCheckedIn: false,
      currentStreak: 7,
      longestStreak: 12,
      freezieBalance: 2,
      freezieAwarded: true,
      streakDropped: false,
      streakProtected: false,
      gemsAwarded: 10,
      gemBalance: 250,
      kaiUnlockedLevel: 3,
      kaiLevelUp: true,
      checkedInDate: "2026-07-03",
    });
  });
});

describe("mapUsageStatus", () => {
  it("maps tier and all three usage nodes", () => {
    const node = (used: number) => ({
      used,
      limit: 100,
      remaining: 100 - used,
      percent: used,
      warning: null,
    });
    const row: UsageStatusResult = {
      tier: "pro",
      text_tokens: node(30),
      maya_photo: node(1),
      leo_photo: node(0),
    };
    const dto = mapUsageStatus(row);
    expect(dto.tier).toBe("pro");
    expect(dto.textTokens.used).toBe(30);
    expect(dto.textTokens.remaining).toBe(70);
    expect(dto.mayaPhoto.used).toBe(1);
    expect(dto.leoPhoto.used).toBe(0);
  });
});

describe("mapLeaderboardEntry", () => {
  it("lowercases the flag code and preserves ranking data", () => {
    const row: GlobalLeaderboardEntry = {
      rank: 1,
      user_id: "u1",
      display_name: "Ada",
      country_code: "TR",
      avatar_url: null,
      current_streak: 40,
      longest_streak: 55,
    };
    expect(mapLeaderboardEntry(row)).toEqual({
      rank: 1,
      userId: "u1",
      name: "Ada",
      flagCode: "tr",
      avatar: "",
      streak: 40,
      longestStreak: 55,
    });
  });
});
