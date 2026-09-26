/**
 * Fat-loss and recomposition programs must finish every day with 30 min
 * Zone 2 cardio. Capsules teach Alex; this helper fills it in if the model skips it.
 */

import { isCoachRetryLine } from "@/lib/kaios/coach-retry";
import {
  extractWorkoutDays,
  parseWorkoutDaysFromSpeech,
  type PlanDay,
  type PlanExercise,
} from "@/lib/kaios/plan-speech";
import type { CoachId, Intent } from "@/lib/kaios/routing/intent";

const CARDIO_GOALS = new Set([
  "lose_weight",
  "lose_weight",
  "fat_loss",
  "cut",
  "recomposition",
  "recomposition",
  "recomp",
]);

const CARDIO_NAME_RE =
  /cardio|kardiyo|walk|incline|bike|cycle|rower|row\b|run|jog|hiit|zone\s*2|koşu|kosu|yürüyüş|yuruyus|bisiklet|ip\s*atlama|jump\s*rope/i;

const INJURY_DAY_RE = /injury|rehab|yaralanma|sakatl[ıi]k|fizyo|physio/i;

const SPEECH_LINE: Record<string, string> = {
  tr: "Her günün son hareketi: 30 dk Zone 2 kardiyo (yokuş yürüyüş / bisiklet / kürek).",
  en: "Last item every day: 30 min Zone 2 cardio (incline walk / bike / rower).",
};

export function parsePrimaryGoalFromUserState(
  userState?: string | null,
): string | null {
  const match = userState?.match(/\bprimary_goal:\s*([a-z_]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function goalNeedsDailyCardio(goal?: string | null): boolean {
  const normalized = (goal ?? "").trim().toLowerCase().replace(/-/g, "_");
  return CARDIO_GOALS.has(normalized);
}

export function dailyCardioExercise(locale: string): PlanExercise {
  const tr = locale.trim().toLowerCase().startsWith("tr");
  return {
    name: tr ? "Kardiyo (Zone 2)" : "Zone 2 cardio",
    sets: 1,
    reps: "30min",
    notes: tr
      ? "30 dk yokuş yürüyüş, bisiklet veya kürek"
      : "30 min incline walk, bike, or rower",
  };
}

export function speechMentionsDailyCardio(text: string): boolean {
  return /30\s*(min|dk|dakika).{0,32}(cardio|kardiyo|zone\s*2)|(cardio|kardiyo|zone\s*2).{0,32}30\s*(min|dk|dakika)/i.test(
    text,
  );
}

function localePrefix(locale: string): string {
  const prefix = locale.trim().toLowerCase().split(/[-_]/)[0] ?? "en";
  return prefix in SPEECH_LINE ? prefix : "en";
}

function dailyCardioSpeechLine(locale: string): string {
  return SPEECH_LINE[localePrefix(locale)] ?? SPEECH_LINE.en;
}

function minutesFromExercise(exercise: PlanExercise): number | null {
  const blob = `${exercise.name ?? ""} ${exercise.reps ?? ""} ${exercise.notes ?? ""}`;
  const match = blob.match(
    /(\d+(?:[.,]\d+)?)(?:\s*[-–—]\s*\d+(?:[.,]\d+)?)?\s*(?:min|dk|dakika)\b/i,
  );
  if (!match?.[1]) return null;
  const n = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function isCardioExercise(exercise: PlanExercise): boolean {
  return CARDIO_NAME_RE.test(`${exercise.name ?? ""} ${exercise.notes ?? ""}`);
}

function isAdequateCardioFinisher(exercise: PlanExercise): boolean {
  if (!isCardioExercise(exercise)) return false;
  const minutes = minutesFromExercise(exercise);
  return minutes != null && minutes >= 25;
}

function dayLabelBlob(day: PlanDay): string {
  return [
    day.dayKey,
    day.day,
    day.name,
    day.title,
    day.focus,
    day.focusKey,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function isInjuryDay(day: PlanDay): boolean {
  return INJURY_DAY_RE.test(dayLabelBlob(day));
}

export function withDailyCardioFinishers(
  days: PlanDay[],
  locale: string,
): { days: PlanDay[]; patched: boolean } {
  const cardio = dailyCardioExercise(locale);
  let patched = false;
  const next = days.map((day) => {
    if (isInjuryDay(day)) return day;
    const exercises = [...(day.exercises ?? [])];
    const last = exercises[exercises.length - 1];
    if (last && isAdequateCardioFinisher(last)) return day;
    patched = true;
    if (last && isCardioExercise(last)) {
      exercises[exercises.length - 1] = { ...last, ...cardio };
    } else {
      exercises.push(cardio);
    }
    return { ...day, exercises };
  });
  return { days: next, patched };
}

function daysFromEnvelope(envelope: { message: string; ui?: unknown }): PlanDay[] {
  const fromUi = extractWorkoutDays(envelope.ui);
  if (fromUi.length > 0) return fromUi;
  return parseWorkoutDaysFromSpeech(envelope.message);
}

function withPatchedDays(ui: unknown, days: PlanDay[]): Record<string, unknown> {
  const rec =
    ui && typeof ui === "object" && !Array.isArray(ui)
      ? { ...(ui as Record<string, unknown>) }
      : {};
  if (rec.cardType == null) rec.cardType = "workout_plan";
  rec.days = days;
  return rec;
}

export function ensureAlexDailyCardio<
  T extends { message: string; ui?: unknown },
>(input: {
  coachId: CoachId | string;
  intent?: Intent | string;
  locale: string;
  userState?: string;
  envelope: T;
}): T {
  if (input.coachId !== "alex") return input.envelope;
  if (input.intent !== "programming") return input.envelope;
  if (isCoachRetryLine(input.envelope.message)) return input.envelope;
  if (!goalNeedsDailyCardio(parsePrimaryGoalFromUserState(input.userState))) {
    return input.envelope;
  }

  const sourceDays = daysFromEnvelope(input.envelope);
  if (sourceDays.length === 0) return input.envelope;

  const { days, patched } = withDailyCardioFinishers(sourceDays, input.locale);
  if (!patched) {
    if (speechMentionsDailyCardio(input.envelope.message)) return input.envelope;
    return {
      ...input.envelope,
      message: `${input.envelope.message.trim()}\n\n${dailyCardioSpeechLine(input.locale)}`,
    };
  }

  const message = speechMentionsDailyCardio(input.envelope.message)
    ? input.envelope.message
    : `${input.envelope.message.trim()}\n\n${dailyCardioSpeechLine(input.locale)}`;

  return {
    ...input.envelope,
    message,
    ui: withPatchedDays(input.envelope.ui, days),
  };
}
