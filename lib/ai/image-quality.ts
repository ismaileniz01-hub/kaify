import { AiError } from "@/lib/ai/errors";
import { logger } from "@/lib/logger";
import {
  imageQualitySchema,
  type ImageQuality,
} from "@/lib/validations/analysis.schema";

/**
 * Minimum acceptable PHOTO quality (lighting/angle/sharpness — NOT physique)
 * before DeepSeek synthesis runs. Env-tunable; invalid env falls back to 3.
 */
export const MIN_QUALITY_SCORE = (() => {
  const raw = Number.parseInt(process.env.AI_MIN_QUALITY_SCORE ?? "", 10);
  return Number.isFinite(raw) && raw >= 1 && raw <= 10 ? raw : 3;
})();

/**
 * Parse quality from a combined vision envelope (no extra provider call).
 */
export function parseImageQuality(raw: unknown): ImageQuality {
  const parsed = imageQualitySchema.safeParse(raw);
  if (!parsed.success) {
    logger.error("[image-quality] provider quality object failed schema", {
      raw: JSON.stringify(raw).slice(0, 600),
      issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
    throw new AiError("AI_BAD_OUTPUT", "Image quality result was malformed");
  }
  return parsed.data;
}
