import { AiError } from "@/lib/ai/errors";
import { aiCopy } from "@/lib/ai/ai-copy";
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

/** User-facing blur/dark photo copy, with up to three provider tips. */
export function formatLowQualityUserMessage(
  locale: string | null | undefined,
  quality: ImageQuality,
): string {
  const base = aiCopy(locale, "low_quality_image");
  const tips = quality.tips
    .map((tip) => tip.trim())
    .filter((tip) => tip.length > 0)
    .slice(0, 3);
  if (tips.length === 0) return base;
  return `${base}\n${tips.map((tip) => `• ${tip}`).join("\n")}`;
}
