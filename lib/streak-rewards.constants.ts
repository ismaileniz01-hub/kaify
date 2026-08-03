/** Shared streak reward constants (client + server). */

export const STREAK_MILESTONES = [7, 31, 61, 120] as const;
export const MILESTONE_GEM_REWARD = 10;
export const STATION_GEM_REWARD = 10;
export const SPECIAL_STATION_DAY = 90;
export const SPECIAL_STATION_GEM_REWARD = 30;

export type StreakRewardClaimSpec = {
  claimKey: string;
  amount: number;
  description: string;
};

/** Builds the full claim list for a streak length (idempotent keys). */
export function buildStreakRewardClaims(
  currentStreak: number,
): StreakRewardClaimSpec[] {
  if (currentStreak <= 0) return [];

  const claims: StreakRewardClaimSpec[] = [];

  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak >= milestone) {
      claims.push({
        claimKey: `milestone:${milestone}`,
        amount: MILESTONE_GEM_REWARD,
        description: `Streak milestone day ${milestone}`,
      });
    }
  }

  for (let day = 1; day <= currentStreak; day++) {
    const amount =
      day === SPECIAL_STATION_DAY ? SPECIAL_STATION_GEM_REWARD : STATION_GEM_REWARD;
    claims.push({
      claimKey: `station:${day}`,
      amount,
      description: `Streak station day ${day}`,
    });
  }

  return claims;
}
