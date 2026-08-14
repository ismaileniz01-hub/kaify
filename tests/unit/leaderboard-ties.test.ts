import { describe, expect, it } from "vitest";
import { mapLeaderboardEntry, type LeaderboardEntryDTO } from "@/lib/types/domain.types";
import type { GlobalLeaderboardEntry } from "@/lib/types/database.types";

function entry(partial: Partial<GlobalLeaderboardEntry> & Pick<GlobalLeaderboardEntry, "rank" | "user_id" | "current_streak">): GlobalLeaderboardEntry {
  return {
    display_name: partial.display_name ?? "n",
    country_code: partial.country_code ?? "TR",
    avatar_url: partial.avatar_url ?? null,
    longest_streak: partial.longest_streak ?? partial.current_streak,
    ...partial,
  };
}

describe("leaderboard ranking semantics", () => {
  it("preserves equal ranks for tied streaks and unique user ids", () => {
    const rows = [
      entry({ rank: 1, user_id: "a", current_streak: 10 }),
      entry({ rank: 1, user_id: "b", current_streak: 10 }),
      entry({ rank: 3, user_id: "c", current_streak: 8 }),
    ];
    const mapped: LeaderboardEntryDTO[] = rows.map(mapLeaderboardEntry);
    expect(mapped.map((m) => m.rank)).toEqual([1, 1, 3]);
    expect(new Set(mapped.map((m) => m.userId)).size).toBe(3);
  });

  it("paginates without duplicating a user id on one page", () => {
    const page = [
      entry({ rank: 4, user_id: "d", current_streak: 7 }),
      entry({ rank: 5, user_id: "e", current_streak: 6 }),
    ].map(mapLeaderboardEntry);
    expect(new Set(page.map((p) => p.userId)).size).toBe(page.length);
  });
});
