import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStreakStatus } from "@/lib/services/streak-status.service";

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

/** Live fitness snapshot injected into chat system prompts (DATA block). */
export async function buildFitnessContextSummary(userId: string): Promise<string> {
  const admin = createAdminSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);

  const [streak, { data: rows }] = await Promise.all([
    getStreakStatus(userId).catch(() => null),
    admin
      .from("analytics_daily")
      .select("entry_date, workouts_completed, workouts_target")
      .eq("user_id", userId)
      .gte("entry_date", (() => {
        const d = new Date(`${today}T12:00:00.000Z`);
        d.setUTCDate(d.getUTCDate() - 13);
        return d.toISOString().slice(0, 10);
      })())
      .lte("entry_date", today)
      .order("entry_date", { ascending: false }),
  ]);

  const workoutRows = (rows ?? []) as WorkoutRow[];
  const todayRow = workoutRows.find((r) => r.entry_date === today);
  const todayWorkouts = Number(todayRow?.workouts_completed) || 0;
  const todayTarget = Number(todayRow?.workouts_target) || 5;
  const restDays = countConsecutiveRestDays(workoutRows, today);

  const parts: string[] = [];
  if (streak) {
    parts.push(`app check-in streak: ${streak.currentStreak} days`);
  }
  parts.push(`today workouts logged: ${todayWorkouts}/${todayTarget}`);
  parts.push(`consecutive days without gym: ${restDays}`);

  const weekWorkouts = workoutRows.reduce(
    (sum, r) => sum + (Number(r.workouts_completed) >= 1 ? 1 : 0),
    0,
  );
  parts.push(`gym days in last 14 calendar days: ${weekWorkouts}`);

  if (restDays >= 5) {
    parts.push("accountability flag: user has skipped gym 5+ days — motivate them to go today");
  } else if (restDays >= 2) {
    parts.push("accountability flag: gym gap building — nudge them back with warmth");
  }

  return parts.join("; ");
}
