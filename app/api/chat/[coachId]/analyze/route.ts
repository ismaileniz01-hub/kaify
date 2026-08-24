import { ApiError } from "@/lib/api/errors";
import { defineDynamicRoute } from "@/lib/api/route-handler";
import { analyzePhoto } from "@/lib/domains/ai";
import {
  isQuotaExhaustedError,
  visionQuotaResourceFromError,
  type AnalyzeQuotaDenied,
} from "@/lib/i18n/api-error";
import {
  MAX_JSON_BODY_ANALYZE,
  parseJsonWithLimit,
} from "@/lib/security/body-limit";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import { analyzeImageInputSchema } from "@/lib/validations/analysis.schema";
import { visionCoachIdSchema } from "@/lib/validations/chat.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/chat/[coachId]/analyze — image analysis pipeline (Maya/Leo only).
 * Same-image reuse (no provider calls) or: quota → one Gemini vision envelope
 * (quality + observations) → DeepSeek synthesis. `warning_trigger` is surfaced
 * through the standard response envelope.
 */
export const POST = defineDynamicRoute<{ coachId: string }>(
  {
    route: "POST /api/chat/[coachId]/analyze",
    rateLimit: "analyze",
    requireAi: true,
    dailyAiBudget: true,
    requireTermsConsent: true,
    requireAiConsent: true,
    requirePhotoConsent: true,
  },
  async ({ user, request, params }) => {
    const coach = visionCoachIdSchema.safeParse(params.coachId);
    if (!coach.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Bu koç fotoğraf analizini desteklemiyor.",
      );
    }

    const body = await parseJsonWithLimit(request, MAX_JSON_BODY_ANALYZE);
    const parsed = analyzeImageInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Geçersiz görsel verisi.",
        parsed.error.issues,
      );
    }

    return withIdempotency({
      userId: user.id,
      endpoint: `POST /api/chat/${coach.data}/analyze`,
      key: getOptionalIdempotencyKey(request),
      requestBody: {
        mimeType: parsed.data.mimeType,
        note: parsed.data.note ?? null,
        locale: parsed.data.locale ?? null,
        imageLen: parsed.data.imageBase64.length,
      },
      handler: async () => {
        try {
          return await analyzePhoto({
            userId: user.id,
            coachId: coach.data,
            imageBase64: parsed.data.imageBase64,
            mimeType: parsed.data.mimeType,
            note: parsed.data.note,
            explicitLocale: parsed.data.locale,
            clientMessageId: parsed.data.clientMessageId,
            signal: request.signal,
          });
        } catch (error) {
          // HTTP 200 + flag: quota is a product state, not a failed resource.
          if (isQuotaExhaustedError(error)) {
            const denied: AnalyzeQuotaDenied = {
              quotaExceeded: true,
              resource:
                visionQuotaResourceFromError(coach.data, error) ??
                (coach.data === "leo" ? "leo_photo" : "maya_photo"),
            };
            return denied;
          }
          throw error;
        }
      },
    });
  },
);
