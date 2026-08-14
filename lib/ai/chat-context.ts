import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStreakStatus } from "@/lib/services/streak-status.service";
import { countConsecutiveRestDays, gymSkipFacts } from "@/lib/ai/count-consecutive-rest-days";

export { countConsecutiveRestDays, gymSkipFacts } from "@/lib/ai/count-consecutive-rest-days";

type WorkoutRow = {
  entry_date: string;
  workouts_completed: number | null;
  workouts_target?: number | null;
};

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
    parts.push(
      `app check-in streak: ${streak.currentStreak} days (daily app check-in, not gym attendance)`,
    );
  }
  parts.push(`today workouts logged: ${todayWorkouts}/${todayTarget}`);

  const weekWorkouts = workoutRows.reduce(
    (sum, r) => sum + (Number(r.workouts_completed) >= 1 ? 1 : 0),
    0,
  );
  parts.push(`gym days in last 14 calendar days: ${weekWorkouts}`);
  parts.push(...gymSkipFacts(workoutRows, restDays));

  return parts.join("; ");
}
