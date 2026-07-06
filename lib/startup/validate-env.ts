import { logger } from "@/lib/logger";
import { getSupabasePublicEnv, getSupabaseServerEnv } from "@/lib/supabase/env";

/**
 * Boot-time environment validation.
 *
 * Runs once per cold start (from instrumentation `register`). Surfaces
 * misconfiguration in logs immediately instead of as a first-request 500.
 * Deliberately does NOT throw: on serverless a throw would take down every
 * request, so we log loudly and let per-dependency getters enforce hard
 * failures where they matter.
 */
export function validateEnvAtBoot(): void {
  const problems: string[] = [];

  try {
    getSupabasePublicEnv();
  } catch (error) {
    problems.push(
      `supabase public env: ${error instanceof Error ? error.message : "invalid"}`,
    );
  }

  try {
    getSupabaseServerEnv();
  } catch (error) {
    problems.push(
      `supabase server env: ${error instanceof Error ? error.message : "invalid"}`,
    );
  }

  // Soft checks — degraded features rather than hard outages.
  const softVars: Record<string, string | undefined> = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
  };
  const missingSoft = Object.entries(softVars)
    .filter(([, v]) => !v || v.includes("your_"))
    .map(([k]) => k);

  if (problems.length > 0) {
    logger.error("env validation failed (critical)", { problems });
  }
  if (missingSoft.length > 0) {
    const isProd = process.env.NODE_ENV === "production";
    const hasUpstash =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
    if (isProd && !hasUpstash) {
      problems.push("UPSTASH_REDIS_REST_URL/TOKEN missing in production (rate limits fail-closed)");
    }
    if (isProd && (!process.env.CRON_SECRET || process.env.CRON_SECRET.includes("your_"))) {
      problems.push("CRON_SECRET missing or placeholder in production");
    }
    logger.warn("env validation: optional vars missing/placeholder", {
      missing: missingSoft,
    });
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.DAILY_CHEST_LIMIT_ENABLED === "false"
  ) {
    problems.push(
      "DAILY_CHEST_LIMIT_ENABLED=false is forbidden in production",
    );
  }

  if (problems.length === 0 && missingSoft.length === 0) {
    logger.info("env validation passed");
  }
}
