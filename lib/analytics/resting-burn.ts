/**
 * Daily energy out overlay: lifestyle-only maintenance is the baseline.
 * Logged workout kcal stored in calories_burned sits on top of that baseline.
 */

export function effectiveDailyBurned(
  caloriesBurned: number | null | undefined,
  maintenanceCalories: number | null | undefined,
  opts?: { includeResting: boolean },
): number {
  const stored = Number(caloriesBurned);
  const workout = Number.isFinite(stored) && stored > 0 ? stored : 0;
  if (!opts?.includeResting) return Math.round(workout);
  const resting =
    Number.isFinite(Number(maintenanceCalories)) &&
    Number(maintenanceCalories) > 0
      ? Number(maintenanceCalories)
      : 0;
  return Math.round(resting + workout);
}
