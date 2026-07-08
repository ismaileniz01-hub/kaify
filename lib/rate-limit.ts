import { logger } from "@/lib/logger";

type RateLimitConfig = {
  requests: number;
  windowMs: number;
};

export type RateLimitOptions = {
  /**
   * When Upstash is missing or errors in production, deny instead of using a
   * per-instance memory fallback. Use on high-cost endpoints (AI, check-in).
   */
  failClosedInProduction?: boolean;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetMs: number;
};

const memoryStore = new Map<string, { count: number; resetTime: number }>();

function isUpstashConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  return (
    url.length > 0 &&
    token.length > 0 &&
    !url.includes("your_") &&
    !token.includes("your_")
  );
}

function upstashHeaders(): HeadersInit {
  return { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` };
}

type UpstashPipelineEntry = { result?: unknown; error?: string };

/**
 * Runs multiple Redis commands in a single Upstash REST pipeline round-trip.
 * Returns one entry per command (each may carry a `result` or an `error`).
 */
async function upstashPipeline(
  commands: (string | number)[][],
): Promise<UpstashPipelineEntry[] | null> {
  const base = process.env.UPSTASH_REDIS_REST_URL;
  if (!base) return null;

  const res = await fetch(`${base}/pipeline`, {
    method: "POST",
    headers: {
      ...upstashHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) return null;
  return (await res.json()) as UpstashPipelineEntry[];
}

function checkMemoryRateLimit(
  key: string,
  config: RateLimitConfig,
  now: number,
): RateLimitResult {
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.requests - 1,
      limit: config.requests,
      resetMs: config.windowMs,
    };
  }

  record.count += 1;
  const allowed = record.count <= config.requests;
  return {
    allowed,
    remaining: Math.max(0, config.requests - record.count),
    limit: config.requests,
    resetMs: Math.max(0, record.resetTime - now),
  };
}

async function checkUpstashRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;

  // Fixed-window counter using only basic data commands (INCR/PTTL/PEXPIRE),
  // which stay compatible with tokens that block EVAL/scripting.
  const pipe = await upstashPipeline([
    ["INCR", redisKey],
    ["PTTL", redisKey],
  ]);

  const incrEntry = pipe?.[0];
  if (!pipe || !incrEntry || typeof incrEntry.result !== "number") {
    throw new Error(
      `Upstash rate-limit command failed: ${
        incrEntry?.error ?? "no result"
      }`,
    );
  }

  const count = incrEntry.result;
  const ttlEntry = pipe[1];
  let ttlMs =
    ttlEntry && typeof ttlEntry.result === "number" ? ttlEntry.result : -1;

  // Set the window expiry on the first hit (or if the key lost its TTL).
  if (count === 1 || ttlMs < 0) {
    const expire = await upstashPipeline([
      ["PEXPIRE", redisKey, config.windowMs],
    ]);
    if (expire?.[0]?.error) {
      throw new Error(`Upstash PEXPIRE failed: ${expire[0].error}`);
    }
    ttlMs = config.windowMs;
  }

  const resetMs = ttlMs > 0 ? ttlMs : config.windowMs;

  return {
    allowed: count <= config.requests,
    remaining: Math.max(0, config.requests - count),
    limit: config.requests,
    resetMs,
  };
}

/**
 * Distributed rate limit with Upstash REST. In production without Upstash, uses
 * a conservative per-instance memory cap (1/10 of configured limit). Callers may
 * set failClosedInProduction to deny requests when the shared store is down.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  options?: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = Date.now();
  const isProduction = process.env.NODE_ENV === "production";
  let upstashFailed = false;

  if (isUpstashConfigured()) {
    try {
      return await checkUpstashRateLimit(key, config);
    } catch (error) {
      upstashFailed = true;
      logger.error("rate-limit upstash error, falling back to memory", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  } else if (isProduction) {
    upstashFailed = true;
    logger.error(
      "rate-limit upstash not configured in production, using memory fallback",
    );
  }

  if (options?.failClosedInProduction && isProduction && upstashFailed) {
    return {
      allowed: false,
      remaining: 0,
      limit: config.requests,
      resetMs: config.windowMs,
    };
  }

  // Keep a usable floor when Redis is down so auth refresh storms don't 429
  // the whole app on a single serverless instance.
  const memoryConfig =
    isProduction && upstashFailed
      ? {
          ...config,
          requests: Math.max(30, Math.ceil(config.requests / 3)),
        }
      : config;

  return checkMemoryRateLimit(key, memoryConfig, now);
}

/**
 * Health probe for the Upstash rate-limit backend. Exercises the actual write
 * commands the limiter needs (INCR + PEXPIRE), so a read-only/underscoped token
 * is reported as unhealthy instead of passing a shallow PING check.
 */
export async function upstashHealth(): Promise<{
  configured: boolean;
  ok: boolean;
}> {
  if (!isUpstashConfigured()) {
    return { configured: false, ok: false };
  }
  try {
    const probe = await upstashPipeline([
      ["INCR", "rl:__healthprobe__"],
      ["PEXPIRE", "rl:__healthprobe__", 10000],
    ]);
    const ok =
      Array.isArray(probe) &&
      typeof probe[0]?.result === "number" &&
      !probe[0]?.error &&
      !probe[1]?.error;
    return { configured: true, ok };
  } catch {
    return { configured: true, ok: false };
  }
}
