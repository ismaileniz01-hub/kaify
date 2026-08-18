import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStreakStatus } from "@/lib/services/streak-status.service";
import { countConsecutiveRestDays, gymSkipFacts } from "@/lib/ai/count-consecutive-rest-days";

export { countConsecutiveRestDays, gymSkipFacts } from "@/lib/ai/count-consecutive-rest-days";

type WorkoutRow = {
  entry_date: string;
  workouts_completed: number | null;
  workouts_target?: number | null;
};

function trimNote(value: string | null | undefined, max = 120): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

/** Trusted onboarding fields injected into USER_CONTEXT (DATA only). */
export type TrustedProfileContextInput = {
  experienceLevel?: string | null;
  trainingDaysPerWeek?: number | null;
  activityLevel?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  dietaryPreference?: string | null;
  dislikedFoods?: string | null;
  healthConditions?: string | null;
  equipmentAccess?: string | null;
};

export function formatTrustedProfileContext(
  input: TrustedProfileContextInput,
): string {
  const parts: string[] = [];
  const experience = trimNote(input.experienceLevel, 32);
  if (experience) parts.push(`experience_level: ${experience}`);

  const days = finiteNumber(input.trainingDaysPerWeek);
  if (days !== null && days >= 0 && days <= 7) {
    parts.push(`training_days_per_week: ${Math.trunc(days)}`);
  }

  const activity = trimNote(input.activityLevel, 32);
  if (activity) parts.push(`activity_level: ${activity}`);

  const height = finiteNumber(input.heightCm);
  if (height !== null && height >= 50 && height <= 280) {
    parts.push(`height_cm: ${Math.round(height)}`);
  }

  const weight = finiteNumber(input.weightKg);
  if (weight !== null && weight >= 20 && weight <= 500) {
    parts.push(`weight_kg: ${Math.round(weight * 10) / 10}`);
  }

  const diet = trimNote(input.dietaryPreference, 32);
  if (diet) parts.push(`dietary_preference: ${diet}`);

  const disliked = trimNote(input.dislikedFoods);
  if (disliked) parts.push(`disliked_foods: ${disliked}`);

  const health = trimNote(input.healthConditions);
  if (health) parts.push(`health_limitations: ${health}`);

  const equipment = trimNote(input.equipmentAccess, 32);
  if (equipment) parts.push(`equipment_access: ${equipment}`);

  return parts.join("; ");
}

/** Live fitness snapshot injected into chat system prompts (DATA block). */
export async function buildFitnessContextSummary(userId: string): Promise<string> {
  const admin = createAdminSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);

  const [streak, { data: rows }, { data: settings }] = await Promise.all([
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
    admin
      .from("user_settings")
      .select("primary_goal")
      .eq("user_id", userId)
      .maybeSingle(),
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
  if (typeof settings?.primary_goal === "string" && settings.primary_goal) {
    parts.push(`primary_goal: ${settings.primary_goal}`);
  }

  const weekWorkouts = workoutRows.reduce(
    (sum, r) => sum + (Number(r.workouts_completed) >= 1 ? 1 : 0),
    0,
  );
  parts.push(`gym days in last 14 calendar days: ${weekWorkouts}`);
  parts.push(...gymSkipFacts(workoutRows, restDays));

  return parts.join("; ");
}
