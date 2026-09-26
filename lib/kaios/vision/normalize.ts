/**
 * Normalize raw Gemini JSON into typed vision observations.
 */

import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/validations/analysis.schema";
import type {
  FoodObservationSchema,
  ImageQualityObservation,
  PhysiqueObservation,
} from "@/lib/kaios/vision/types";

const muscleSet = new Set<string>(MUSCLE_GROUPS);

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

function asStringList(value: unknown, max = 20): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
  return list.length > 0 ? list : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asPortion(value: unknown): string | number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return asString(value);
}

function readRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function normalizeFoodObservation(raw: unknown): FoodObservationSchema {
  const obj = readRecord(raw);
  const macrosRaw = readRecord(obj.estimatedMacros ?? obj.estimated_macros);

  const estimatedMacros = {
    calories: asFiniteNumber(macrosRaw.calories),
    protein: asFiniteNumber(macrosRaw.protein),
    carbohydrates: asFiniteNumber(
      macrosRaw.carbohydrates ?? macrosRaw.carb ?? macrosRaw.carbs,
    ),
    fat: asFiniteNumber(macrosRaw.fat),
  };

  const hasAnyMacro = Object.values(estimatedMacros).some((v) => v !== undefined);

  return {
    identity: asString(obj.identity ?? obj.food ?? obj.name),
    portion: asPortion(obj.portion ?? obj.portionSize ?? obj.portion_size),
    portionUnit: asString(obj.portionUnit ?? obj.portion_unit ?? obj.unit),
    prep: asString(obj.prep ?? obj.preparation),
    ingredients: asStringList(obj.ingredients),
    ambiguity: asStringList(obj.ambiguity ?? obj.uncertainties),
    confidence: asFiniteNumber(obj.confidence),
    estimatedMacros: hasAnyMacro ? estimatedMacros : undefined,
  };
}

export function normalizePhysiqueObservation(raw: unknown): PhysiqueObservation {
  const obj = readRecord(raw);
  const visibleRaw = obj.visibleMuscles ?? obj.visible_muscles ?? [];
  const visibleMuscles = (
    Array.isArray(visibleRaw) ? visibleRaw : []
  ).filter((m): m is MuscleGroup => typeof m === "string" && muscleSet.has(m));

  const scoresRaw = readRecord(obj.scores);
  const scores: Partial<Record<MuscleGroup, number>> = {};
  for (const [key, value] of Object.entries(scoresRaw)) {
    if (!muscleSet.has(key)) continue;
    const n = asFiniteNumber(value);
    if (n === undefined) continue;
    scores[key as MuscleGroup] = Math.min(100, Math.max(0, n));
  }

  return {
    visibleMuscles,
    qualitativeNotes: asStringList(
      obj.qualitativeNotes ?? obj.qualitative_notes ?? obj.notes,
    ),
    postureNotes: asStringList(obj.postureNotes ?? obj.posture_notes),
    ambiguity: asStringList(obj.ambiguity),
    confidence: asFiniteNumber(obj.confidence),
    scores: Object.keys(scores).length > 0 ? scores : undefined,
    overallScore: asFiniteNumber(obj.overallScore ?? obj.overall_score),
  };
}

export function normalizeImageQualityObservation(
  raw: unknown,
): ImageQualityObservation {
  const obj = readRecord(raw);
  const score = asFiniteNumber(obj.score);
  if (score === undefined || score < 1 || score > 10) {
    return {
      status: "INVALID_PROVIDER_OUTPUT",
      issues: [],
      tips: [],
    };
  }
  const clamped = Math.min(10, Math.max(1, score));
  const issues = asStringList(obj.issues, 10) ?? [];
  const tips = asStringList(obj.tips, 10) ?? [];
  if (clamped < 6) {
    return {
      status: "INSUFFICIENT_QUALITY",
      score: clamped,
      issues,
      tips,
    };
  }
  return { status: "VALID", score: clamped, issues, tips };
}
