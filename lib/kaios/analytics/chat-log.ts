/**
 * Deterministic chat → analytics pending confirmation.
 * Same class of gap as Maya food logs: KAIOS does not run the legacy
 * analytics LLM, so reported workouts/water never reached the analysis page.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { localTodayDate } from "@/lib/date-utils";
import { createPendingAnalyticsConfirmation } from "@/lib/services/analytics-confirmation.service";
import type { CoachId } from "@/lib/kaios/routing/intent";
import type { ActionTruthRecord } from "@/lib/kaios/tools/action-truth";
import {
  estimateCaloriesFromWorkoutPlan,
  looksLikeWorkoutCompletion,
  parseCaloriesBurnedFromText,
  parseWorkoutCompletion,
  type WorkoutPlanForBurn,
} from "@/lib/kaios/analytics/workout-log";

export type ChatLogPatch = {
  summary: string;
  patch: Record<string, number>;
  tool: string;
};

export {
  looksLikeWorkoutCompletion,
  parseWorkoutCompletion,
  parseCaloriesBurnedFromText,
  estimateCaloriesFromWorkoutPlan,
} from "@/lib/kaios/analytics/workout-log";

function parseNum(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const DRINK_VERB_RE = /\b(içtim|ictim|i\s+drank|drank|i\s+had)\b/i;

export function parseHydrationLiters(message: string): number | null {
  const msg = message.trim();
  if (!DRINK_VERB_RE.test(msg)) return null;
  const ml = msg.match(/(\d+(?:[.,]\d+)?)\s*ml\b/i);
  if (ml?.[1]) {
    const n = parseNum(ml[1]);
    if (n == null || n <= 0) return null;
    return Math.round((n / 1000) * 100) / 100;
  }
  const liters = msg.match(/(\d+(?:[.,]\d+)?)\s*(?:l\b|lt\b|litre|liter|liters)/i);
  if (liters?.[1]) {
    const n = parseNum(liters[1]);
    if (n == null || n <= 0 || n > 30) return null;
    return Math.round(n * 100) / 100;
  }
  return null;
}

function planFromPayload(payload: unknown): WorkoutPlanForBurn | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const root = payload as Record<string, unknown>;
  const nested =
    (root.data as Record<string, unknown> | undefined) ??
    (root.ui as Record<string, unknown> | undefined) ??
    root;
  const days = nested.days ?? root.days;
  const exercises = nested.exercises ?? root.exercises;
  if (!Array.isArray(days) && !Array.isArray(exercises)) return null;
  return {
    days: Array.isArray(days) ? (days as WorkoutPlanForBurn["days"]) : undefined,
    exercises: Array.isArray(exercises)
      ? (exercises as WorkoutPlanForBurn["exercises"])
      : undefined,
  };
}

export function patchForCoachChatLog(
  coach: CoachId,
  userMessage: string,
  opts?: {
    currentWorkouts?: number;
    currentBurned?: number;
    sessionKcal?: number | null;
  },
): ChatLogPatch | null {
  if (coach === "maya") {
    const liters = parseHydrationLiters(userMessage);
    if (liters == null) return null;
    return {
      tool: "recordHydration",
      summary: `${liters}L water`,
      patch: { waterLiters: liters },
    };
  }
  if (coach === "alex") {
    const workout = parseWorkoutCompletion(userMessage);
    if (!workout) return null;
    const sessionKcal = workout.caloriesBurned ?? opts?.sessionKcal ?? null;
    const currentWorkouts = Math.max(0, opts?.currentWorkouts ?? 0);
    const currentBurned = Math.max(0, opts?.currentBurned ?? 0);
    const workoutsCompleted = currentWorkouts + workout.workoutsCompleted;
    const patch: Record<string, number> = { workoutsCompleted };
    if (sessionKcal != null && sessionKcal >= 50) {
      patch.caloriesBurned = currentBurned + sessionKcal;
    }
    const summary =
      sessionKcal != null && sessionKcal >= 50
        ? workout.workoutsCompleted > 1
          ? `${workout.workoutsCompleted} workout(s), ${sessionKcal} kcal burned`
          : `1 workout · ${sessionKcal} kcal`
        : `${workout.workoutsCompleted} workout(s)`;
    return {
      tool: "logWorkout",
      summary,
      patch,
    };
  }
  return null;
}

async function loadWorkoutLogContext(userId: string): Promise<{
  currentWorkouts: number;
  currentBurned: number;
  weightKg: number | null;
  plan: WorkoutPlanForBurn | null;
}> {
  const admin = createAdminSupabaseClient();
  const [{ data: profile }, { data: planRow }] = await Promise.all([
    admin
      .from("profiles")
      .select("timezone, weight_kg")
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("chat_messages")
      .select("payload")
      .eq("user_id", userId)
      .eq("coach_id", "alex")
      .eq("sender", "coach")
      .eq("message_type", "workout_plan")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const timezone =
    typeof profile?.timezone === "string" && profile.timezone.trim()
      ? profile.timezone
      : "UTC";
  const today = localTodayDate(timezone);
  const { data: row } = await admin
    .from("analytics_daily")
    .select("workouts_completed, calories_burned")
    .eq("user_id", userId)
    .eq("entry_date", today)
    .maybeSingle();
  const weightRaw = Number(profile?.weight_kg);
  return {
    currentWorkouts: Number(row?.workouts_completed) || 0,
    currentBurned: Number(row?.calories_burned) || 0,
    weightKg: Number.isFinite(weightRaw) && weightRaw >= 40 ? weightRaw : null,
    plan: planFromPayload(planRow?.payload),
  };
}

export async function maybeQueueCoachLogConfirmation(input: {
  userId: string;
  coach: CoachId;
  userMessage: string;
  assistantText?: string;
  alreadyConfirming?: boolean;
}): Promise<{
  confirmation?: { pendingId: string; summary: string };
  truths: ActionTruthRecord[];
}> {
  if (input.alreadyConfirming) return { truths: [] };
  if (input.coach !== "alex" && input.coach !== "maya") return { truths: [] };
  if (
    input.coach === "alex" &&
    !looksLikeWorkoutCompletion(input.userMessage)
  ) {
    return { truths: [] };
  }

  let sessionKcal: number | null = null;
  let currentWorkouts = 0;
  let currentBurned = 0;
  if (input.coach === "alex") {
    try {
      const ctx = await loadWorkoutLogContext(input.userId);
      currentWorkouts = ctx.currentWorkouts;
      currentBurned = ctx.currentBurned;
      sessionKcal =
        parseCaloriesBurnedFromText(input.assistantText ?? "") ??
        estimateCaloriesFromWorkoutPlan(ctx.plan, ctx.weightKg);
    } catch {
      sessionKcal = parseCaloriesBurnedFromText(input.assistantText ?? "");
    }
  }

  const spec = patchForCoachChatLog(input.coach, input.userMessage, {
    currentWorkouts,
    currentBurned,
    sessionKcal,
  });
  if (!spec) return { truths: [] };

  const pendingId = await createPendingAnalyticsConfirmation({
    userId: input.userId,
    coachId: input.coach,
    source: "chat",
    payload: { summary: spec.summary, patch: spec.patch },
  });

  return {
    confirmation: { pendingId, summary: spec.summary },
    truths: [
      {
        status: "PENDING_CONFIRMATION",
        tool: spec.tool,
        message: "Awaiting user confirmation",
        data: { pendingId, saved: false, ...spec.patch },
      },
    ],
  };
}
