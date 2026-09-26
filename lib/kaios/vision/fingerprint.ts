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

export const VISION_REUSE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type StoredVisionRow = {
  id: string;
  created_at: string;
  content: string | null;
  payload: Json | null;
  user_id?: string;
  coach_id?: string;
  message_type?: string;
};

function qualityLooksValid(payload: Json | null): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }
  const quality = (payload as Record<string, unknown>).quality;
  if (!quality || typeof quality !== "object" || Array.isArray(quality)) {
    return false;
  }
  const score = (quality as Record<string, unknown>).score;
  return typeof score === "number" && Number.isFinite(score) && score >= 1;
}

/**
 * Same-image reuse: user-scoped, analysis-type (message_type) scoped, TTL-bounded.
 * Failed analyses are never stored as coach rows, so they cannot be reused.
 */
export function selectReusableVisionRow(params: {
  rows: StoredVisionRow[];
  fingerprint: string;
  userId: string;
  coachId: string;
  messageType: string;
  now?: number;
}): StoredVisionRow | null {
  const now = params.now ?? Date.now();
  for (const row of params.rows) {
    if (row.user_id && row.user_id !== params.userId) continue;
    if (row.coach_id && row.coach_id !== params.coachId) continue;
    if (row.message_type && row.message_type !== params.messageType) continue;
    const created = Date.parse(row.created_at);
    if (!Number.isFinite(created) || now - created > VISION_REUSE_TTL_MS) continue;
    if (extractFingerprintFromPayload(row.payload) !== params.fingerprint) continue;
    if (!extractAnalysisFromPayload(row.payload)) continue;
    if (!qualityLooksValid(row.payload)) continue;
    if (!row.content || row.content.trim().length === 0) continue;
    return row;
  }
  return null;
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
