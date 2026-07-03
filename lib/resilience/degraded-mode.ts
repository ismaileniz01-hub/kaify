import { cacheGet, cacheSet } from "@/lib/cache";
import { logger } from "@/lib/logger";

const DEGRADED_KEY = "sys:degraded";
const DEGRADED_REASON_KEY = "sys:degraded:reason";
const DEFAULT_TTL_SEC = 900; // 15 minutes

export type DegradedState = {
  active: boolean;
  reason?: string;
  since?: string;
};

export async function getDegradedState(): Promise<DegradedState> {
  const active = await cacheGet<{ since: string; reason: string }>(DEGRADED_KEY);
  if (!active) return { active: false };
  return {
    active: true,
    since: active.since,
    reason: active.reason,
  };
}

export async function enterDegradedMode(reason: string): Promise<void> {
  const payload = { since: new Date().toISOString(), reason };
  await cacheSet(DEGRADED_KEY, payload, DEFAULT_TTL_SEC);
  await cacheSet(DEGRADED_REASON_KEY, reason, DEFAULT_TTL_SEC);
  logger.warn("degraded-mode entered", { reason });
}

export async function exitDegradedMode(): Promise<void> {
  await cacheSet(DEGRADED_KEY, null, 1);
  await cacheSet(DEGRADED_REASON_KEY, null, 1);
  logger.info("degraded-mode cleared");
}
