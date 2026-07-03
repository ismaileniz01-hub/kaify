import { logger } from "@/lib/logger";

/**
 * Lightweight read-through cache backed by Upstash Redis (REST).
 *
 * Fail-open by design: any cache error (misconfig, network, parse) silently
 * falls back to computing the value fresh, so caching can never take the app
 * down — it only reduces load when healthy. Use for data that is shared across
 * users or expensive to recompute (leaderboards, near-static catalogs).
 */

function isConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  return (
    url.length > 0 &&
    token.length > 0 &&
    !url.includes("your_") &&
    !token.includes("your_")
  );
}

async function redisCommand<T>(command: (string | number)[]): Promise<T | null> {
  const base = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;

  const res = await fetch(base, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    // Never let a slow cache stall a request longer than necessary.
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { result?: T };
  return json.result ?? null;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isConfigured()) return null;
  try {
    const raw = await redisCommand<string>(["GET", key]);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    logger.warn("cache get failed", {
      key,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  if (!isConfigured()) return;
  try {
    await redisCommand(["SET", key, JSON.stringify(value), "EX", String(ttlSeconds)]);
  } catch (error) {
    logger.warn("cache set failed", {
      key,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function cacheDelete(key: string): Promise<void> {
  if (!isConfigured()) return;
  try {
    await redisCommand(["DEL", key]);
  } catch {
    // best-effort invalidation
  }
}

/**
 * Read-through helper: returns the cached value when present, otherwise runs
 * `producer`, caches the result, and returns it. Errors thrown by `producer`
 * propagate (and are never cached).
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;

  const fresh = await producer();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

/**
 * Read-through cache with stale fallback: if `producer` throws, serve the last
 * good value from a longer-lived stale key instead of failing the request.
 */
export async function cachedWithStale<T>(
  key: string,
  ttlSeconds: number,
  staleTtlSeconds: number,
  producer: () => Promise<T>,
): Promise<T> {
  const staleKey = `${key}:stale`;

  try {
    const fresh = await cached(key, ttlSeconds, producer);
    await cacheSet(staleKey, fresh, staleTtlSeconds);
    return fresh;
  } catch (error) {
    const stale = await cacheGet<T>(staleKey);
    if (stale !== null) {
      logger.warn("cache stale fallback served", { key });
      return stale;
    }
    throw error;
  }
}
