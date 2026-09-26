type WorkoutRow = {
  entry_date: string;
  workouts_completed: number | null;
  workouts_target?: number | null;
};

/**
 * Consecutive calendar days (including today) with zero logged gym workouts,
 * walking backward until the last day with workouts_completed >= 1.
 */
export function countConsecutiveRestDays(
  rows: WorkoutRow[],
  todayIso: string,
): number {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.entry_date, Number(row.workouts_completed) || 0);
  }

  let count = 0;
  const cursor = new Date(`${todayIso}T12:00:00.000Z`);

  for (let i = 0; i < 14; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    const workouts = byDate.get(key);

    if (workouts === undefined) {
      // Missing row = no workout logged that day.
      count += 1;
    } else if (workouts >= 1) {
      break;
    } else {
      count += 1;
    }

    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return count;
}

/** Only claim a gym gap when at least one workout was logged in the window. */
export function gymSkipFacts(
  workoutRows: WorkoutRow[],
  restDays: number,
): string[] {
  const everGym = workoutRows.some((r) => Number(r.workouts_completed) >= 1);
  if (!everGym) return [];

  const parts = [
    `canonical: consecutive days without gym: ${restDays} (source: TRUSTED_ANALYTICS)`,
  ];
  if (restDays >= 5) {
    parts.push(
      "accountability flag: user has skipped gym 5+ days — motivate them to go today",
    );
  } else if (restDays >= 2) {
    parts.push(
      "accountability flag: gym gap building — nudge them back with warmth",
    );
  }
  return parts;
}
