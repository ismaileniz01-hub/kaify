/**
 * Daily energy out overlay: calorie goal is the user's TDEE/budget proxy.
 * Workout kcal stored in calories_burned sits on top of that resting burn.
 */

export function effectiveDailyBurned(
  caloriesBurned: number | null | undefined,
  calorieGoal: number | null | undefined,
  opts?: { includeResting: boolean },
): number {
  const stored = Number(caloriesBurned);
  const workout = Number.isFinite(stored) && stored > 0 ? stored : 0;
  if (!opts?.includeResting) return Math.round(workout);
  const resting =
    Number.isFinite(Number(calorieGoal)) && Number(calorieGoal) > 0
      ? Number(calorieGoal)
      : 0;
  return Math.round(resting + workout);
}
