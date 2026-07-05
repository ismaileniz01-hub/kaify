import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getCircuitSnapshots } from "@/lib/ai/circuit-breaker";
import { upstashHealth } from "@/lib/rate-limit";
import { verifyCronSecret } from "@/lib/api/cron-auth";
import { defineRouteRaw } from "@/lib/api/route-handler";
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

function isAuthorizedForDetail(request: Request): boolean {
  return verifyCronSecret(request);
}

/**
 * GET /api/health
 *
 * Anonymous callers receive a cheap liveness probe only (no DB/storage/Upstash
 * amplification). Full dependency checks require CRON_SECRET (monitors, cron).
 */
export const GET = defineRouteRaw(
  { route: "GET /api/health", auth: "none", publicRateLimit: "health_probe" },
  async ({ request }) => {
    const detailed = isAuthorizedForDetail(request);

    if (!detailed) {
      return new Response(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
    }

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

    const body: HealthBody = {
      status: isDown ? "degraded" : "ok",
      timestamp: new Date().toISOString(),
      checks,
    };

    return new Response(JSON.stringify(body), {
      status: isDown ? 503 : 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  },
);
