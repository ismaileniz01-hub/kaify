import { ApiError } from "@/lib/api/errors";
import { defineDynamicRoute } from "@/lib/api/route-handler";
import { analyzePhoto } from "@/lib/services/analysis.service";
import {
  MAX_JSON_BODY_ANALYZE,
  parseJsonWithLimit,
} from "@/lib/security/body-limit";
import { analyzeImageInputSchema } from "@/lib/validations/analysis.schema";
import { visionCoachIdSchema } from "@/lib/validations/chat.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/chat/[coachId]/analyze — image analysis pipeline (Maya/Leo only).
 * Runs quota guard -> Gemini quality gate -> Gemini measurement -> DeepSeek
 * synthesis, then returns the personalized summary + structured analysis with
 * a `warning_trigger` surfaced through the standard response envelope.
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

    return analyzePhoto({
      userId: user.id,
      coachId: coach.data,
      imageBase64: parsed.data.imageBase64,
      mimeType: parsed.data.mimeType,
      note: parsed.data.note,
    });
  },
);
