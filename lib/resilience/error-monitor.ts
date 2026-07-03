import { logger } from "@/lib/logger";

const WINDOW_SEC = 300;
const SPIKE_THRESHOLD = Number.parseInt(
  process.env.ERROR_SPIKE_THRESHOLD ?? "25",
  10,
);

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

async function redisRaw<T>(command: (string | number)[]): Promise<T | null> {
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
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { result?: T };
  return json.result ?? null;
}

const INCR_EXPIRE_LUA =
  "local c = redis.call('INCR', KEYS[1]) " +
  "if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end " +
  "return c";

function statusClass(status: number): string {
  if (status >= 500) return "5xx";
  if (status >= 400) return "4xx";
  return "other";
}

function routeKey(route: string): string {
  return route.replace(/[^a-zA-Z0-9:/_-]/g, "_").slice(0, 120);
}

export type ErrorRecord = {
  route: string;
  status: number;
  code?: string;
};

export type SpikeCheck = {
  recorded: boolean;
  spikeDetected: boolean;
  global5xxCount: number;
};

export async function recordApiError(record: ErrorRecord): Promise<SpikeCheck> {
  const out: SpikeCheck = {
    recorded: false,
    spikeDetected: false,
    global5xxCount: 0,
  };

  if (!isConfigured()) return out;

  try {
    const cls = statusClass(record.status);
    const rk = routeKey(record.route);
    const routeCounter = `err:${rk}:${cls}`;

    await redisRaw<number>(["EVAL", INCR_EXPIRE_LUA, 1, routeCounter, WINDOW_SEC]);
    out.recorded = true;

    if (cls === "5xx") {
      const global5xx = "err:global:5xx";
      const count = await redisRaw<number>([
        "EVAL",
        INCR_EXPIRE_LUA,
        1,
        global5xx,
        WINDOW_SEC,
      ]);
      out.global5xxCount = count ?? 0;
      out.spikeDetected = out.global5xxCount >= SPIKE_THRESHOLD;

      if (out.spikeDetected) {
        logger.error("error-monitor spike detected", {
          route: record.route,
          status: record.status,
          code: record.code,
          global5xxCount: out.global5xxCount,
          threshold: SPIKE_THRESHOLD,
        });
      }
    }
  } catch (error) {
    logger.warn("error-monitor record failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return out;
}

export async function getErrorMonitorSnapshot(): Promise<
  { key: string; count: number }[]
> {
  if (!isConfigured()) return [];
  const global5xx = await redisRaw<string>(["GET", "err:global:5xx"]);
  const count = global5xx ? Number(global5xx) : 0;
  return count > 0 ? [{ key: "global:5xx (5m window)", count }] : [];
}
