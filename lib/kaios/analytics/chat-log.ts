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
  estimateSessionCaloriesBurned,
  looksLikeWorkoutCompletion,
  parseWorkoutCompletion,
} from "@/lib/kaios/analytics/workout-log";

export type ChatLogPatch = {
  summary: string;
  patch: Record<string, number>;
  tool: string;
};

export {
  looksLikeWorkoutCompletion,
  parseWorkoutCompletion,
  estimateSessionCaloriesBurned,
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

export function patchForCoachChatLog(
  coach: CoachId,
  userMessage: string,
  opts?: {
    goal?: string | null;
    currentWorkouts?: number;
    currentBurned?: number;
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
    const sessionKcal =
      workout.caloriesBurned ??
      estimateSessionCaloriesBurned(opts?.goal) * workout.workoutsCompleted;
    const currentWorkouts = Math.max(0, opts?.currentWorkouts ?? 0);
    const currentBurned = Math.max(0, opts?.currentBurned ?? 0);
    const workoutsCompleted = currentWorkouts + workout.workoutsCompleted;
    const caloriesBurned = currentBurned + sessionKcal;
    const summary =
      workout.workoutsCompleted > 1
        ? `${workout.workoutsCompleted} workout(s), ${sessionKcal} kcal burned`
        : `1 workout · ${sessionKcal} kcal`;
    return {
      tool: "logWorkout",
      summary,
      patch: { workoutsCompleted, caloriesBurned },
    };
  }
  return null;
}

async function loadWorkoutLogBaseline(userId: string): Promise<{
  goal: string | null;
  currentWorkouts: number;
  currentBurned: number;
}> {
  const admin = createAdminSupabaseClient();
  const [{ data: settings }, { data: profile }] = await Promise.all([
    admin
      .from("user_settings")
      .select("primary_goal")
      .eq("user_id", userId)
      .maybeSingle(),
    admin.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
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
  return {
    goal:
      typeof settings?.primary_goal === "string" ? settings.primary_goal : null,
    currentWorkouts: Number(row?.workouts_completed) || 0,
    currentBurned: Number(row?.calories_burned) || 0,
  };
}

export async function maybeQueueCoachLogConfirmation(input: {
  userId: string;
  coach: CoachId;
  userMessage: string;
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

  let baseline:
    | { goal: string | null; currentWorkouts: number; currentBurned: number }
    | undefined;
  if (input.coach === "alex") {
    try {
      baseline = await loadWorkoutLogBaseline(input.userId);
    } catch {
      baseline = {
        goal: null,
        currentWorkouts: 0,
        currentBurned: 0,
      };
    }
  }

  const spec = patchForCoachChatLog(input.coach, input.userMessage, baseline);
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
