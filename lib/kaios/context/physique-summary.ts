/**
 * Pure cross-coach fact formatters — no service imports (avoids cycles).
 */

import { MUSCLE_GROUPS } from "@/lib/validations/analysis.schema";

const MUSCLE_SET = new Set<string>(MUSCLE_GROUPS);
const LAGGING_GAP = 8;
const LAGGING_ABS_MAX = 55;
const MAX_LAGGING = 2;

export type PhysiqueScoreMap = Record<string, number>;

export type PhysiqueLaggingSummary = {
  overall: number | null;
  scores: PhysiqueScoreMap;
  lagging: string[];
  priority: string | null;
  compact: string;
};

function finiteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function readScoreMap(raw: unknown): PhysiqueScoreMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const scores: PhysiqueScoreMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!MUSCLE_SET.has(key)) continue;
    const n = finiteNumber(value);
    if (n === null) continue;
    scores[key] = Math.min(100, Math.max(0, n));
  }
  return scores;
}

export function summarizePhysiqueScores(
  scores: PhysiqueScoreMap,
  overall?: number | null,
): PhysiqueLaggingSummary {
  const entries = Object.entries(scores)
    .filter((entry): entry is [string, number] => Number.isFinite(entry[1]))
    .sort((a, b) => a[1] - b[1]);
  const computedOverall =
    finiteNumber(overall) ??
    (entries.length > 0
      ? Math.round(
          entries.reduce((sum, [, n]) => sum + n, 0) / entries.length,
        )
      : null);
  const lagging: string[] = [];
  if (entries.length >= 2) {
    const spread = entries[entries.length - 1]![1] - entries[0]![1];
    if (spread >= LAGGING_GAP) {
      for (const [group, score] of entries) {
        if (lagging.length >= MAX_LAGGING) break;
        const belowOverall =
          computedOverall !== null && score <= computedOverall - LAGGING_GAP;
        if (belowOverall || score <= LAGGING_ABS_MAX) {
          lagging.push(group);
        }
      }
    }
  }
  const priority = lagging[0] ?? null;
  const parts: string[] = [];
  if (computedOverall !== null) parts.push(`leo_overall: ${computedOverall}`);
  if (lagging.length > 0) {
    parts.push(`leo_lagging: ${lagging.join(",")}`);
    if (priority) parts.push(`leo_priority: ${priority}`);
  }
  const scoreBits = entries
    .slice()
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${Math.round(v)}`)
    .join(",");
  if (scoreBits) parts.push(`leo_scores: ${scoreBits}`);
  return {
    overall: computedOverall,
    scores,
    lagging,
    priority,
    compact: parts.join("; "),
  };
}

export function extractPhysiqueFromLeoPayload(
  payload: unknown,
): PhysiqueLaggingSummary | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const analysis =
    root.analysis && typeof root.analysis === "object"
      ? (root.analysis as Record<string, unknown>)
      : root;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;
  const scores = {
    ...readScoreMap(analysis.scores),
    ...readScoreMap(data?.body_parts),
    ...readScoreMap(root.scores),
  };
  if (Object.keys(scores).length === 0) return null;
  const overall =
    finiteNumber(analysis.overall_score) ??
    finiteNumber(analysis.overallScore) ??
    finiteNumber(data?.overall) ??
    finiteNumber(root.overall_score) ??
    finiteNumber(root.overallScore);
  return summarizePhysiqueScores(scores, overall);
}

function formatLiters(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return String(rounded);
}

export function formatNutritionSnapshot(input: {
  calorieGoal?: number | null;
  proteinGoalG?: number | null;
  carbsGoalG?: number | null;
  fatGoalG?: number | null;
  caloriesConsumed?: number | null;
  proteinG?: number | null;
  waterLiters?: number | null;
  waterGoalLiters?: number | null;
}): string {
  const parts: string[] = [];
  const calorieGoal = finiteNumber(input.calorieGoal);
  const proteinGoal = finiteNumber(input.proteinGoalG);
  const carbsGoal = finiteNumber(input.carbsGoalG);
  const fatGoal = finiteNumber(input.fatGoalG);
  const calories = finiteNumber(input.caloriesConsumed);
  const protein = finiteNumber(input.proteinG);
  const water = finiteNumber(input.waterLiters);
  const waterGoal = finiteNumber(input.waterGoalLiters);
  if (calorieGoal !== null && calorieGoal > 0) {
    parts.push(`calorie_goal: ${Math.round(calorieGoal)}`);
  }
  if (proteinGoal !== null && proteinGoal > 0) {
    parts.push(`protein_goal_g: ${Math.round(proteinGoal)}`);
  }
  if (carbsGoal !== null && carbsGoal > 0) {
    parts.push(`carbs_goal_g: ${Math.round(carbsGoal)}`);
  }
  if (fatGoal !== null && fatGoal > 0) {
    parts.push(`fat_goal_g: ${Math.round(fatGoal)}`);
  }
  if (calories !== null && calorieGoal !== null && calorieGoal > 0) {
    parts.push(`calories_today: ${Math.round(calories)}/${Math.round(calorieGoal)}`);
  }
  if (protein !== null && proteinGoal !== null && proteinGoal > 0) {
    parts.push(
      `protein_today_g: ${Math.round(protein)}/${Math.round(proteinGoal)}`,
    );
  }
  if (waterGoal !== null && waterGoal > 0) {
    parts.push(
      `water_today_l: ${formatLiters(water ?? 0)}/${formatLiters(waterGoal)}`,
    );
  }
  return parts.join("; ");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function daysFromPlanPayload(root: Record<string, unknown>): unknown[] {
  const ui = asRecord(root.ui);
  const data = asRecord(root.data);
  const nestedUi = asRecord(data?.ui);
  for (const candidate of [ui?.days, data?.days, nestedUi?.days, root.days]) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }
  return [];
}

/** Compact a plan day label so coaches can read i18n keys like workout.chest_triceps. */
export function humanizePlanDayLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed
    .replace(/^workout\./i, "")
    .replace(/_/g, " ")
    .slice(0, 40);
}

function labelFromPlanDay(rec: Record<string, unknown>): string {
  const candidates = [rec.focus, rec.name, rec.title, rec.focusKey, rec.dayKey];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return humanizePlanDayLabel(value);
    }
  }
  return "";
}

export function extractAlexPlanFocus(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const names: string[] = [];
  for (const day of daysFromPlanPayload(root)) {
    if (!day || typeof day !== "object") continue;
    const label = labelFromPlanDay(day as Record<string, unknown>);
    if (label && names.length < 7) names.push(label);
  }
  if (names.length === 0) return null;
  return `alex_last_plan: ${names.join(" | ")}`;
}

const TEAM_FACT_KEEP =
  /^(leo_|alex_last|calorie_goal|protein_goal|carbs_goal|fat_goal|calories_today|protein_today|water_today|primary_goal|experience_level|training_days|training_focus)/;

function teamFactRank(line: string): number {
  if (/^(leo_|alex_last)/.test(line)) return 0;
  if (
    /^(calorie_goal|protein_goal|calories_today|protein_today|water_today|primary_goal|training_days)/.test(
      line,
    )
  ) {
    return 1;
  }
  return 2;
}

/** TEAM_FACTS budget: keep Leo/Alex/Maya facts ahead of carbs/fat extras. */
export function prioritizeTeamFactLines(
  snapshot: string,
  limit = 8,
): string[] {
  return snapshot
    .split(/;\s*/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 && line.length <= 180 && TEAM_FACT_KEEP.test(line),
    )
    .sort((a, b) => teamFactRank(a) - teamFactRank(b) || a.localeCompare(b))
    .slice(0, limit);
}
