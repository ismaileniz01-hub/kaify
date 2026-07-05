import { describe, expect, it } from "vitest";
import {
  isFresh,
  LEADERBOARD_SNAPSHOT_MAX_AGE_MS,
} from "@/lib/services/leaderboard-snapshot.service";

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
