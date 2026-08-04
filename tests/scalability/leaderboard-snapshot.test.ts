import { describe, expect, it } from "vitest";
import {
  isFresh,
  LEADERBOARD_SNAPSHOT_MAX_AGE_MS,
} from "@/lib/services/leaderboard-snapshot.service";
import {
  mapCountryLeaderboardEntry,
  mapLeaderboardEntry,
} from "@/lib/types/domain.types";

describe("leaderboard snapshot freshness", () => {
  it("accepts snapshots within max age", () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(isFresh(recent)).toBe(true);
  });

  it("rejects stale snapshots", () => {
    const stale = new Date(Date.now() - LEADERBOARD_SNAPSHOT_MAX_AGE_MS - 1000).toISOString();
    expect(isFresh(stale)).toBe(false);
  });
});

describe("leaderboard mappers null-safe country", () => {
  it("maps null country_code without throwing", () => {
    expect(
      mapLeaderboardEntry({
        rank: 1,
        user_id: "u1",
        display_name: "A",
        avatar_url: null,
        country_code: null,
        current_streak: 1,
        longest_streak: 1,
      }).flagCode,
    ).toBe("xx");

    expect(
      mapCountryLeaderboardEntry({
        rank: 1,
        country_code: null,
        total_streak: 10,
        user_count: 2,
        avg_streak: 5,
      }).countryCode,
    ).toBe("xx");
  });
});
