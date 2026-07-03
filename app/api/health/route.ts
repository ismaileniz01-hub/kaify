import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getCircuitSnapshots } from "@/lib/ai/circuit-breaker";
import { upstashHealth } from "@/lib/rate-limit";
import { verifyCronSecret } from "@/lib/api/cron-auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckState = "ok" | "degraded" | "down" | "skipped";

type HealthCheck = {
  status: CheckState;
  detail?: string;
};

type HealthBody = {
  status: "ok" | "degraded";
  timestamp: string;
  checks: {
    database: HealthCheck;
    storage: HealthCheck;
    rateLimiter: HealthCheck;
    ai: HealthCheck;
  };
};

const CHECK_TIMEOUT_MS = 3_000;

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), CHECK_TIMEOUT_MS)),
  ]);
}

type ErrorResult = { error: { message: string } | null };

async function checkDatabase(): Promise<HealthCheck> {
  try {
    const admin = createAdminSupabaseClient();
    const probe: Promise<ErrorResult> = Promise.resolve(
      admin
        .from("profiles")
        .select("id")
        .limit(1)
        .then((r) => ({ error: r.error ? { message: r.error.message } : null })),
    );
    const { error } = await withTimeout<ErrorResult>(probe, {
      error: { message: "timeout" },
    });
    return error ? { status: "down", detail: error.message } : { status: "ok" };
  } catch (error) {
    return { status: "down", detail: error instanceof Error ? error.message : "unknown" };
  }
}

async function checkStorage(): Promise<HealthCheck> {
  try {
    const admin = createAdminSupabaseClient();
    const probe: Promise<ErrorResult> = Promise.resolve(
      admin.storage
        .from("avatars")
        .list("", { limit: 1 })
        .then((r) => ({ error: r.error ? { message: r.error.message } : null })),
    );
    const { error } = await withTimeout<ErrorResult>(probe, {
      error: { message: "timeout" },
    });
    return error ? { status: "degraded", detail: error.message } : { status: "ok" };
  } catch (error) {
    return { status: "degraded", detail: error instanceof Error ? error.message : "unknown" };
  }
}

async function checkRateLimiter(): Promise<HealthCheck> {
  const health = await withTimeout(upstashHealth(), { configured: true, ok: false });
  if (!health.configured) {
    return {
      status: process.env.NODE_ENV === "production" ? "down" : "skipped",
      detail: "Upstash not configured",
    };
  }
  return health.ok ? { status: "ok" } : { status: "down", detail: "ping failed" };
}

function checkAi(): HealthCheck {
  const snapshots = getCircuitSnapshots();
  const open = snapshots.filter((s) => s.open).map((s) => s.provider);
  if (open.length === snapshots.length && snapshots.length > 0) {
    return { status: "down", detail: `all providers open: ${open.join(", ")}` };
  }
  if (open.length > 0) {
    return { status: "degraded", detail: `open: ${open.join(", ")}` };
  }
  return { status: "ok" };
}

/**
 * Detailed check output (dependency names, error messages, open AI providers)
 * is only returned to callers presenting the CRON_SECRET bearer token. This
 * prevents information disclosure to anonymous clients while keeping the
 * endpoint usable by internal monitors and operators.
 */
function isAuthorizedForDetail(request: Request): boolean {
  return verifyCronSecret(request);
}

/**
 * GET /api/health — deep readiness probe.
 * Aggregates database, storage, rate-limiter (Upstash) and AI circuit-breaker
 * health. Returns 503 when a critical dependency (database or, in production,
 * the rate limiter) is down; 200 otherwise (degraded still returns 200 so
 * uptime monitors distinguish "up but impaired" from "down").
 *
 * Anonymous callers receive only a coarse `{ status, timestamp }` plus the
 * correct HTTP status code. Full `checks` detail requires the CRON_SECRET.
 */
export async function GET(request: Request) {
  const [database, storage, rateLimiter] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkRateLimiter(),
  ]);
  const ai = checkAi();

  const checks = { database, storage, rateLimiter, ai };
  const critical: CheckState[] = [database.status, rateLimiter.status];
  const isDown = critical.includes("down");
  const anyImpaired = Object.values(checks).some(
    (c) => c.status === "down" || c.status === "degraded",
  );

  if (isDown) {
    logger.error("health check critical failure", { checks });
  } else if (anyImpaired) {
    logger.warn("health check impaired", { checks });
  }

  const detailed = isAuthorizedForDetail(request);
  const body: HealthBody | { status: HealthBody["status"]; timestamp: string } =
    detailed
      ? {
          status: isDown ? "degraded" : "ok",
          timestamp: new Date().toISOString(),
          checks,
        }
      : {
          status: isDown ? "degraded" : "ok",
          timestamp: new Date().toISOString(),
        };

  return new Response(JSON.stringify(body), {
    status: isDown ? 503 : 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
