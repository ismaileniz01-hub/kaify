import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { ModelRouter, type ImagePipelineResult } from "@/lib/ai/model-router";
import { personaForCoach } from "@/lib/ai/personas";
import { refundQuota, reserveQuota } from "@/lib/ai/quota-guard";
import { toApiError } from "@/lib/ai/errors";
import { prepareVisionImage } from "@/lib/security/image";
import { getCoachOrThrow } from "@/lib/services/coach.service";
import {
  requestPhotoAnalyticsConfirmation,
  type PhotoAnalyticsConfirmation,
} from "@/lib/ai/coach-analytics";
import {
  extractAnalysisFromPayload,
  fingerprintVisionImage,
  selectReusableVisionRow,
  type StoredVisionRow,
} from "@/lib/kaios/vision/fingerprint";
import { resolveLocale } from "@/lib/i18n/dictionary";
import { detectMessageLocale } from "@/lib/i18n/detect-message-locale";
import { resolveActiveLocale } from "@/lib/kaios/localization/resolve";
import type { ScoreDrift } from "@/lib/ai/consistency";
import type {
  AnalysisMimeType,
  ImageQuality,
  MuscleScores,
  TechnicalAnalysis,
} from "@/lib/validations/analysis.schema";
import type {
  Json,
  MessageType,
  UsageResource,
  WarningTrigger,
} from "@/lib/types/database.types";

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

export type AnalyzePhotoParams = {
  userId: string;
  coachId: string;
  imageBase64: string;
  mimeType: AnalysisMimeType;
  note?: string;
  signal?: AbortSignal;
};

export type AnalyzePhotoResult = {
  summary: string;
  analysis: TechnicalAnalysis;
  drift: ScoreDrift[];
  quality: ImageQuality;
  warningTrigger: WarningTrigger | null;
  messageId: string | null;
  confirmation: PhotoAnalyticsConfirmation | null;
  geminiCalls: number;
  deepseekCalls: number;
  reused: boolean;
};

function resourceForCoach(coachId: "maya" | "leo"): UsageResource {
  return coachId === "maya" ? "maya_photo" : "leo_photo";
}

function extractScores(payload: Json | null): MuscleScores | null {
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
  return out;
}

function extractQuality(payload: Json | null): ImageQuality | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const quality = (payload as Record<string, unknown>).quality;
  if (!quality || typeof quality !== "object" || Array.isArray(quality)) {
    return null;
  }
  const score = (quality as Record<string, unknown>).score;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  const issues = (quality as Record<string, unknown>).issues;
  const tips = (quality as Record<string, unknown>).tips;
  return {
    score,
    issues: Array.isArray(issues)
      ? issues.filter((v): v is string => typeof v === "string")
      : [],
    tips: Array.isArray(tips)
      ? tips.filter((v): v is string => typeof v === "string")
      : [],
  };
}

async function getLocale(
  admin: AdminClient,
  userId: string,
  note?: string,
): Promise<string> {
  const { data } = await admin
    .from("profiles")
    .select("locale")
    .eq("id", userId)
    .maybeSingle();
  const saved = resolveLocale(data?.locale);
  const message = note?.trim() ?? "";
  return resolveActiveLocale({
    message,
    messageLocale: message ? detectMessageLocale(message, saved) : null,
    savedLocale: saved,
    fallbackLocale: "en",
  });
}

async function getPreviousScores(
  admin: AdminClient,
  userId: string,
  coachId: string,
): Promise<MuscleScores | null> {
  const { data } = await admin
    .from("chat_messages")
    .select("payload")
    .eq("user_id", userId)
    .eq("coach_id", coachId)
    .eq("sender", "coach")
    .eq("message_type", "score")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return extractScores(data?.payload ?? null);
}

async function loadRecentVisionRows(
  admin: AdminClient,
  userId: string,
  coachId: string,
  messageType: MessageType,
): Promise<StoredVisionRow[]> {
  const { data, error } = await admin
    .from("chat_messages")
    .select("id, created_at, content, payload, user_id, coach_id, message_type")
    .eq("user_id", userId)
    .eq("coach_id", coachId)
    .eq("sender", "coach")
    .eq("message_type", messageType)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    logger.warn("[analysis.service] vision reuse lookup failed", {
      error: error.message,
    });
    return [];
  }
  return (data ?? []) as StoredVisionRow[];
}

function foodHasUsableMacros(analysis: TechnicalAnalysis): boolean {
  const food = analysis.food_analysis;
  if (!food) return false;
  return [food.calories, food.protein, food.carb, food.fat].every(
    (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
  );
}

function observationAmbiguous(analysis: TechnicalAnalysis): boolean {
  const extra = analysis as TechnicalAnalysis & { ambiguity?: unknown };
  if (!Array.isArray(extra.ambiguity)) return false;
  return extra.ambiguity.some((v) => typeof v === "string" && v.trim().length > 0);
}

/**
 * Photo analysis:
 *  1. Normalize image bytes (fingerprint source).
 *  2. Same-user / same-type fingerprint reuse (no Gemini, no extra quota).
 *  3. Else reserve quota → one Gemini envelope → DeepSeek synthesis → persist.
 */
export async function analyzePhoto(
  params: AnalyzePhotoParams,
): Promise<AnalyzePhotoResult> {
  const admin = createAdminSupabaseClient();

  const coach = await getCoachOrThrow(params.coachId);
  const persona = personaForCoach(coach.id);
  if (!persona || !coach.supports_vision) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Bu koç fotoğraf analizini desteklemiyor.",
    );
  }
  const visionCoachId = persona.id;
  const resource = resourceForCoach(visionCoachId);
  const messageType = persona.kind === "food" ? "analysis" : "score";

  const vision = await prepareVisionImage(params.imageBase64);
  const fingerprint = fingerprintVisionImage(vision.base64, vision.mimeType);

  const [locale, previousScores, priorRows] = await Promise.all([
    getLocale(admin, params.userId, params.note),
    persona.kind === "body"
      ? getPreviousScores(admin, params.userId, params.coachId)
      : Promise.resolve(null),
    loadRecentVisionRows(admin, params.userId, params.coachId, messageType),
  ]);

  const reusedRow = selectReusableVisionRow({
    rows: priorRows,
    fingerprint,
    userId: params.userId,
    coachId: params.coachId,
    messageType,
  });

  if (reusedRow) {
    const analysis = extractAnalysisFromPayload(reusedRow.payload);
    const quality = extractQuality(reusedRow.payload);
    if (analysis && quality) {
      return {
        summary: reusedRow.content ?? "",
        analysis,
        drift: [],
        quality,
        warningTrigger: null,
        messageId: reusedRow.id,
        confirmation: null,
        geminiCalls: 0,
        deepseekCalls: 0,
        reused: true,
      };
    }
  }

  const usage = await reserveQuota({ userId: params.userId, resource, amount: 1 });

  let result: ImagePipelineResult;
  try {
    result = await ModelRouter.analyzeImagePipeline({
      userId: params.userId,
      persona: persona.id,
      locale,
      image: { base64: vision.base64, mimeType: vision.mimeType },
      previousScores,
      userNote: params.note,
      signal: params.signal,
    });
  } catch (error) {
    await refundQuota({ userId: params.userId, resource, amount: 1 });
    throw toApiError(error, locale);
  }

  const payload = {
    analysis: result.analysis,
    drift: result.drift,
    quality: result.quality,
    image_fingerprint: fingerprint,
    nutrition_provenance: persona.kind === "food" ? "model_estimate" : null,
    score_authority: persona.kind === "body" ? "leo_eval" : null,
  } as unknown as Json;

  const { error: userPhotoError } = await admin.from("chat_messages").insert({
    user_id: params.userId,
    coach_id: params.coachId,
    thread_type: "direct",
    sender: "user",
    message_type: "photo_analysis",
    content: params.note && params.note.length > 0 ? params.note : "[photo]",
    payload: { mimeType: params.mimeType, image_fingerprint: fingerprint } as unknown as Json,
    locale,
  });
  if (userPhotoError) {
    logger.error("[analysis.service] persist user photo error", {
      error: userPhotoError.message,
    });
    await refundQuota({ userId: params.userId, resource, amount: 1 });
    throw new ApiError("INTERNAL_ERROR", "Fotoğraf kaydı başarısız.");
  }

  const { data: inserted, error: insertError } = await admin
    .from("chat_messages")
    .insert({
      user_id: params.userId,
      coach_id: params.coachId,
      thread_type: "direct",
      sender: "coach",
      message_type: messageType,
      content: result.summary,
      payload,
      tokens_used: result.usage?.total_tokens ?? 0,
      locale,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    logger.error("[analysis.service] persist error", {
      error: insertError?.message ?? "missing row",
    });
    await refundQuota({ userId: params.userId, resource, amount: 1 });
    throw new ApiError("INTERNAL_ERROR", "Analiz sonucu kaydedilemedi.");
  }

  let confirmation: PhotoAnalyticsConfirmation | null = null;

  if (
    persona.kind === "food" &&
    foodHasUsableMacros(result.analysis) &&
    !observationAmbiguous(result.analysis)
  ) {
    const food = result.analysis.food_analysis!;
    try {
      confirmation = await requestPhotoAnalyticsConfirmation({
        userId: params.userId,
        coachId: params.coachId,
        attachToMessageId: inserted?.id ?? null,
        meal: {
          calories: food.calories,
          protein: food.protein,
          carbs: food.carb,
          fat: food.fat,
        },
      });
    } catch (error) {
      logger.error("[analysis.service] meal confirmation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    summary: result.summary,
    analysis: result.analysis,
    drift: result.drift,
    quality: result.quality,
    warningTrigger: usage.warning_trigger,
    messageId: inserted?.id ?? null,
    confirmation,
    geminiCalls: result.geminiCalls,
    deepseekCalls: result.deepseekCalls,
    reused: false,
  };
}

export { extractFingerprintFromPayload } from "@/lib/kaios/vision/fingerprint";
export { fingerprintVisionImage };
