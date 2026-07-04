import { ApiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Per-user rate limiting for expensive endpoints (AI chat / photo analysis).
 *
 * The IP-based middleware limit protects the edge; this adds an account-scoped
 * ceiling so a single authenticated user cannot burst costly AI calls (cost +
 * abuse control) independent of the quota system. Backed by the same Upstash
 * store as the global limiter.
 */
export const AI_RATE_LIMITS = {
  chat: { requests: 20, windowMs: 60 * 1000 },
  analyze: { requests: 10, windowMs: 60 * 1000 },
  team_meeting: { requests: 3, windowMs: 60 * 1000 },
  avatar: { requests: 5, windowMs: 60 * 1000 },
  checkin: { requests: 10, windowMs: 60 * 1000 },
  steps: { requests: 30, windowMs: 60 * 1000 },
} as const;

export type AiRateAction = keyof typeof AI_RATE_LIMITS;

export async function enforceUserRateLimit(
  userId: string,
  action: AiRateAction,
): Promise<void> {
  const config = AI_RATE_LIMITS[action];
  const result = await checkRateLimit(`ai:${action}:${userId}`, config, {
    failClosedInProduction: true,
  });

  if (!result.allowed) {
    logger.warn("user AI rate limit exceeded", { userId, action });
    throw new ApiError(
      "RATE_LIMITED",
      "Çok hızlı istek gönderiyorsun. Lütfen birkaç saniye bekle.",
      { retryAfterMs: result.resetMs },
    );
  }
}
