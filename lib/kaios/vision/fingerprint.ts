/**
 * Leo same-image score stability helpers.
 * Fingerprints the vision payload (post-preprocess) so re-uploads of the same
 * photo can reuse prior muscle scores instead of inventing a new historical row.
 */

import { createHash } from "crypto";
import type { MuscleScores, TechnicalAnalysis } from "@/lib/validations/analysis.schema";
import type { Json } from "@/lib/types/database.types";

export function fingerprintVisionImage(base64: string, mimeType: string): string {
  return createHash("sha256")
    .update(`${mimeType}\n`)
    .update(base64)
    .digest("hex");
}

export function extractScoresFromPayload(payload: Json | null): MuscleScores | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const analysis = (payload as Record<string, unknown>).analysis;
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) {
    return null;
  }
  const scores = (analysis as Record<string, unknown>).scores;
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) {
    return null;
  }
  const out: MuscleScores = {};
  for (const [key, value] of Object.entries(scores)) {
    if (typeof value === "number") {
      out[key as keyof MuscleScores] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function extractFingerprintFromPayload(payload: Json | null): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const fp = (payload as Record<string, unknown>).image_fingerprint;
  return typeof fp === "string" && fp.length >= 16 ? fp : null;
}

export function extractAnalysisFromPayload(
  payload: Json | null,
): TechnicalAnalysis | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const analysis = (payload as Record<string, unknown>).analysis;
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) {
    return null;
  }
  return analysis as TechnicalAnalysis;
}

/**
 * Given recent coach score payloads, return a prior analysis for the same
 * fingerprint when present (same-image stability).
 */
export function findPriorAnalysisForFingerprint(
  payloads: Array<Json | null>,
  fingerprint: string,
): TechnicalAnalysis | null {
  for (const payload of payloads) {
    if (extractFingerprintFromPayload(payload) === fingerprint) {
      return extractAnalysisFromPayload(payload);
    }
  }
  return null;
}
