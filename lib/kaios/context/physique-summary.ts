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

export function formatNutritionSnapshot(input: {
  calorieGoal?: number | null;
  proteinGoalG?: number | null;
  carbsGoalG?: number | null;
  fatGoalG?: number | null;
  caloriesConsumed?: number | null;
  proteinG?: number | null;
}): string {
  const parts: string[] = [];
  const calorieGoal = finiteNumber(input.calorieGoal);
  const proteinGoal = finiteNumber(input.proteinGoalG);
  const carbsGoal = finiteNumber(input.carbsGoalG);
  const fatGoal = finiteNumber(input.fatGoalG);
  const calories = finiteNumber(input.caloriesConsumed);
  const protein = finiteNumber(input.proteinG);
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
  return parts.join("; ");
}

export function extractAlexPlanFocus(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const ui =
    root.ui && typeof root.ui === "object"
      ? (root.ui as Record<string, unknown>)
      : root;
  const daysRaw = Array.isArray(ui.days)
    ? ui.days
    : Array.isArray(root.days)
      ? root.days
      : [];
  const names: string[] = [];
  for (const day of daysRaw) {
    if (!day || typeof day !== "object") continue;
    const rec = day as Record<string, unknown>;
    const label =
      (typeof rec.focus === "string" && rec.focus.trim()) ||
      (typeof rec.name === "string" && rec.name.trim()) ||
      (typeof rec.title === "string" && rec.title.trim()) ||
      "";
    if (label && names.length < 7) names.push(label.slice(0, 40));
  }
  if (names.length === 0) return null;
  return `alex_last_plan: ${names.join(" | ")}`;
}
