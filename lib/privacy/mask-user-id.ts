import { createHash } from "crypto";

/** Stable opaque id for leaderboard rows (not reversible to UUID). */
export function maskUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 12);
}

export function resolveLeaderboardUserId(
  userId: string,
  viewerId?: string,
): string {
  if (viewerId && userId === viewerId) {
    return userId;
  }
  return maskUserId(userId);
}
