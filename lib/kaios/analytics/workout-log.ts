/**
 * Workout-complete detection — shared by intent routing and analytics patches.
 * Kept free of CoachId imports to avoid intent ↔ chat-log cycles.
 */

const WORKOUT_DONE_RE =
  /(?:antrenman(?:[ıi])?|workout|session|gym|spor(?:u)?|salon(?:u)?)\s*(?:mı\s+)?(?:bitirdim|tamamladım|tamamladim|yaptım|yaptim|bitti)|(?:bitirdim|tamamladım|tamamladim|finished|completed)\s+(?:(?:the|my|a)\s+)?(?:antrenman|workout|session|gym|spor)|(?:i(?:['’]ve| have)?\s+)?(?:just\s+)?(?:finished|completed|done)\s+(?:(?:a|my|the)\s+)?(?:workout|session|gym)|workout\s+done|log(?:ged)?(?:\s+my)?\s+workout|salondan\s+ç[ıi]kt[ıi]m/i;

export function looksLikeWorkoutCompletion(message: string): boolean {
  return WORKOUT_DONE_RE.test(message.trim());
}

export function parseWorkoutCompletion(
  message: string,
): { workoutsCompleted: number; caloriesBurned?: number } | null {
  if (!looksLikeWorkoutCompletion(message)) return null;
  const count = message.match(
    /(\d+)\s*(?:antrenman|workouts?|sessions?|seans)/i,
  );
  let workoutsCompleted = 1;
  if (count?.[1]) {
    const n = Number.parseInt(count[1], 10);
    if (n >= 1 && n <= 5) workoutsCompleted = n;
  }
  const burned = message.match(
    /(\d{2,4})\s*(?:kcal|kalori).{0,16}(?:yak|burn)|(?:yak|burn).{0,16}(\d{2,4})\s*(?:kcal|kalori)/i,
  );
  const caloriesBurned = burned
    ? Number.parseInt(burned[1] || burned[2] || "", 10)
    : NaN;
  return {
    workoutsCompleted,
    ...(Number.isFinite(caloriesBurned) && caloriesBurned >= 20
      ? { caloriesBurned }
      : {}),
  };
}

/** Session estimate when the user logs a workout without naming kcal. */
export function estimateSessionCaloriesBurned(
  goal: string | null | undefined,
): number {
  switch (goal) {
    case "recomposition":
    case "lose_weight":
      return 400;
    case "endurance":
      return 450;
    case "build_muscle":
      return 280;
    case "stay_fit":
      return 320;
    default:
      return 350;
  }
}
