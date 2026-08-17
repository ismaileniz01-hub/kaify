/**
 * Deterministic chat → analytics pending confirmation.
 * Same class of gap as Maya food logs: KAIOS does not run the legacy
 * analytics LLM, so reported workouts/water never reached the analysis page.
 */

import { createPendingAnalyticsConfirmation } from "@/lib/services/analytics-confirmation.service";
import type { CoachId } from "@/lib/kaios/routing/intent";
import type { ActionTruthRecord } from "@/lib/kaios/tools/action-truth";

export type ChatLogPatch = {
  summary: string;
  patch: Record<string, number>;
  tool: string;
};

function parseNum(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

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
    const patch: Record<string, number> = {
      workoutsCompleted: workout.workoutsCompleted,
    };
    if (workout.caloriesBurned != null) {
      patch.caloriesBurned = workout.caloriesBurned;
    }
    const summary =
      workout.caloriesBurned != null
        ? `${workout.workoutsCompleted} workout(s), ${workout.caloriesBurned} kcal burned`
        : `${workout.workoutsCompleted} workout(s)`;
    return { tool: "logWorkout", summary, patch };
  }
  return null;
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
  const spec = patchForCoachChatLog(input.coach, input.userMessage);
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
