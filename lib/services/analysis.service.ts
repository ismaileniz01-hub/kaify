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
import type { ScoreDrift } from "@/lib/ai/consistency";
import {
  extractScoresFromPayload,
  findPriorAnalysisForFingerprint,
  fingerprintVisionImage,
} from "@/lib/kaios/vision/fingerprint";
import { emitKaiosEventBestEffort } from "@/lib/kaios/events";
import type {
  AnalysisMimeType,
  ImageQuality,
  MuscleScores,
  TechnicalAnalysis,
} from "@/lib/validations/analysis.schema";
import type {
  Json,
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
};

export type AnalyzePhotoResult = {
  summary: string;
  analysis: TechnicalAnalysis;
  drift: ScoreDrift[];
  quality: ImageQuality;
  warningTrigger: WarningTrigger | null;
  messageId: string | null;
  confirmation: PhotoAnalyticsConfirmation | null;
};

function resourceForCoach(coachId: "maya" | "leo"): UsageResource {
  return coachId === "maya" ? "maya_photo" : "leo_photo";
}

async function getLocale(admin: AdminClient, userId: string): Promise<string> {
  const { data } = await admin
    .from("profiles")
    .select("locale")
    .eq("id", userId)
    .maybeSingle();
  return data?.locale ?? "tr";
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

  return extractScoresFromPayload(data?.payload ?? null);
}

async function getPriorAnalysisByFingerprint(
  admin: AdminClient,
  userId: string,
  coachId: string,
  fingerprint: string,
): Promise<TechnicalAnalysis | null> {
  const { data } = await admin
    .from("chat_messages")
    .select("payload")
    .eq("user_id", userId)
    .eq("coach_id", coachId)
    .eq("sender", "coach")
    .eq("message_type", "score")
    .order("created_at", { ascending: false })
    .limit(20);

  return findPriorAnalysisForFingerprint(
    (data ?? []).map((row) => row.payload ?? null),
    fingerprint,
  );
}

/**
 * analyzeImagePipeline orchestration (§1 Pipelining):
 *   1. Reserve one photo credit atomically before AI work.
 *   2. Gemini quality gate -> Gemini measurement (JSON) -> DeepSeek synthesis.
 *   3. Persist on success; refund the credit when AI rejects or fails.
 *
 * Low-quality photos are rejected (AiError -> 400) and the reserved credit is refunded.
 * Same-image Leo reuploads reuse prior scores via fingerprint (score stability).
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
  const visionCoachId = persona.id; // "maya" | "leo"
  const resource = resourceForCoach(visionCoachId);

  // Validate + downscale BEFORE reserving quota, so a bad image never burns a
  // credit and the (2×) Gemini calls receive a compact, cheaper payload.
  const vision = await prepareVisionImage(params.imageBase64);
  const imageFingerprint = fingerprintVisionImage(vision.base64, vision.mimeType);

  const usage = await reserveQuota({ userId: params.userId, resource, amount: 1 });

  const [locale, previousScores, reuseAnalysis] = await Promise.all([
    getLocale(admin, params.userId),
    persona.kind === "body"
      ? getPreviousScores(admin, params.userId, params.coachId)
      : Promise.resolve(null),
    persona.kind === "body"
      ? getPriorAnalysisByFingerprint(
          admin,
          params.userId,
          params.coachId,
          imageFingerprint,
        )
      : Promise.resolve(null),
  ]);

  // 2) Hybrid pipeline (Gemini -> DeepSeek). May throw AI_LOW_QUALITY.
  let result: ImagePipelineResult;
  try {
    result = await ModelRouter.analyzeImagePipeline({
      userId: params.userId,
      persona: persona.id,
      locale,
      image: { base64: vision.base64, mimeType: vision.mimeType },
      previousScores,
      reuseAnalysis,
      userNote: params.note,
    });
  } catch (error) {
    await refundQuota({ userId: params.userId, resource, amount: 1 });
    throw toApiError(error);
  }

  // 3) Persist (no raw image stored) + consume one credit.
  // Maya confirmation flow stays below — analyze ≠ auto-save.
  const messageType = persona.kind === "food" ? "analysis" : "score";
  const payload = {
    analysis: result.analysis,
    drift: result.drift,
    quality: result.quality,
    ...(persona.kind === "body" ? { image_fingerprint: imageFingerprint } : {}),
    ...(result.nutritionProvenance
      ? { provenance: result.nutritionProvenance }
      : {}),
  } as unknown as Json;

  const { error: userPhotoError } = await admin.from("chat_messages").insert({
    user_id: params.userId,
    coach_id: params.coachId,
    thread_type: "direct",
    sender: "user",
    message_type: "photo_analysis",
    content: params.note && params.note.length > 0 ? params.note : "[photo]",
    payload: { mimeType: params.mimeType } as unknown as Json,
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

  if (persona.kind === "body") {
    await emitKaiosEventBestEffort({
      category: "physique",
      type: "physique_scored",
      userId: params.userId,
      payload: {
        overall_score: result.analysis.overall_score,
        reused: Boolean(reuseAnalysis),
        messageId: inserted.id,
      },
      at: new Date().toISOString(),
    });
  }

  let confirmation: PhotoAnalyticsConfirmation | null = null;

  // Reflect a logged meal onto today's analytics after user confirmation.
  if (persona.kind === "food" && result.analysis.food_analysis) {
    const food = result.analysis.food_analysis;
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
  };
}
