import { NextRequest } from "next/server";
import { requireUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { handleApiError, ok } from "@/lib/api/response";
import { enforceUserRateLimit } from "@/lib/api/rate-guard";
import { analyzePhoto } from "@/lib/services/analysis.service";
import {
  MAX_JSON_BODY_ANALYZE,
  parseJsonWithLimit,
} from "@/lib/security/body-limit";
import { analyzeImageInputSchema } from "@/lib/validations/analysis.schema";
import { visionCoachIdSchema } from "@/lib/validations/chat.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ coachId: string }> };

/**
 * POST /api/chat/[coachId]/analyze — image analysis pipeline (Maya/Leo only).
 * Runs quota guard -> Gemini quality gate -> Gemini measurement -> DeepSeek
 * synthesis, then returns the personalized summary + structured analysis with
 * a `warning_trigger` surfaced through the standard response envelope.
 */
export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const user = await requireUser();

    const { coachId } = await ctx.params;
    const coach = visionCoachIdSchema.safeParse(coachId);
    if (!coach.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Bu koç fotoğraf analizini desteklemiyor.",
      );
    }

    await enforceUserRateLimit(user.id, "analyze");

    const body = await parseJsonWithLimit(request, MAX_JSON_BODY_ANALYZE);
    const parsed = analyzeImageInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Geçersiz görsel verisi.",
        parsed.error.issues,
      );
    }

    const result = await analyzePhoto({
      userId: user.id,
      coachId: coach.data,
      imageBase64: parsed.data.imageBase64,
      mimeType: parsed.data.mimeType,
      note: parsed.data.note,
    });

    return ok(result, result.warningTrigger ? { warningTrigger: result.warningTrigger } : {});
  } catch (error) {
    return handleApiError(error, { route: "/api/chat/[coachId]/analyze" });
  }
}
