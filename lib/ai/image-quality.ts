import { generateGeminiJson } from "@/lib/ai/gemini.client";
import { buildImageQualityPrompt } from "@/lib/ai/personas";
import { AiError } from "@/lib/ai/errors";
import { logger } from "@/lib/logger";
import {
  imageQualitySchema,
  type ImageQuality,
} from "@/lib/validations/analysis.schema";
import type { ImageInput } from "@/lib/ai/types";

/** Minimum acceptable quality score; below this the analysis is rejected. */
export const MIN_QUALITY_SCORE = 6;

/**
 * Pre-analysis quality gate. Returns a 1-10 score plus issues and "golden
 * tips" (lighting/angle/background) the user can act on. Cheap Gemini call run
 * before the (more expensive) full analysis + synthesis.
 */
export async function assessImageQuality(
  image: ImageInput,
  signal?: AbortSignal,
  ctx?: { userId?: string },
): Promise<ImageQuality> {
  const raw = await generateGeminiJson({
    prompt: buildImageQualityPrompt(),
    image,
    temperature: 0,
    signal,
    usageContext: ctx?.userId
      ? { userId: ctx.userId, operation: "quality_gate" }
      : { operation: "quality_gate" },
  });

  const parsed = imageQualitySchema.safeParse(raw);
  if (!parsed.success) {
    logger.error("[image-quality] gemini output failed schema", {
      raw: JSON.stringify(raw).slice(0, 600),
      issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
    throw new AiError("AI_BAD_OUTPUT", "Image quality result was malformed");
  }
  return parsed.data;
}
