import type { MuscleScores } from "@/lib/validations/analysis.schema";

/**
 * Consistency check for physique scoring. Sudden large swings between two
 * photos usually reflect lighting/angle differences rather than real change,
 * so we flag them and let the persona gently warn the user.
 */

export type ScoreDrift = {
  muscle: string;
  previous: number;
  current: number;
  deltaPercent: number;
};

export const DRIFT_THRESHOLD_PERCENT = 20;

export function computeScoreDrift(
  previous: MuscleScores | null | undefined,
  current: Record<string, number>,
): ScoreDrift[] {
  if (!previous) {
    return [];
  }

  const drifts: ScoreDrift[] = [];

  for (const [muscle, currentValue] of Object.entries(current)) {
    if (typeof currentValue !== "number") continue;

    const previousValue = previous[muscle as keyof MuscleScores];
    if (typeof previousValue !== "number" || previousValue <= 0) continue;

    const deltaPercent = Math.round(
      (Math.abs(currentValue - previousValue) / previousValue) * 100,
    );

    if (deltaPercent >= DRIFT_THRESHOLD_PERCENT) {
      drifts.push({
        muscle,
        previous: previousValue,
        current: currentValue,
        deltaPercent,
      });
    }
  }

  return drifts;
}
