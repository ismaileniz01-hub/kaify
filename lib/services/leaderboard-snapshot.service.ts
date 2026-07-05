import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cacheSet } from "@/lib/cache";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { logger } from "@/lib/logger";
import {
  mapCountryLeaderboardEntry,
  mapLeaderboardEntry,
  type CountryLeaderboardDTO,
  type LeaderboardEntryDTO,
} from "@/lib/types/domain.types";

/** Snapshots older than this are ignored (cron should refresh every 15m). */
export const LEADERBOARD_SNAPSHOT_MAX_AGE_MS = 15 * 60 * 1000;

export const LEADERBOARD_SNAPSHOT_TARGETS = {
  global: { limit: 50, offset: 0 },
  country: { limit: 100 },
} as const;

type SnapshotRow = {
  snapshot_key: string;
  payload: unknown;
  refreshed_at: string;
};

export function isFresh(refreshedAt: string): boolean {
  const age = Date.now() - new Date(refreshedAt).getTime();
  return age >= 0 && age <= LEADERBOARD_SNAPSHOT_MAX_AGE_MS;
}

function parseGlobalPayload(payload: unknown): LeaderboardEntryDTO[] | null {
  if (!Array.isArray(payload)) return null;
  return payload as LeaderboardEntryDTO[];
}

function parseCountryPayload(payload: unknown): CountryLeaderboardDTO[] | null {
  if (!Array.isArray(payload)) return null;
  return payload as CountryLeaderboardDTO[];
}

async function readSnapshotRow(key: string): Promise<SnapshotRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await (admin as SupabaseClient)
    .from("leaderboard_snapshots")
    .select("snapshot_key, payload, refreshed_at")
    .eq("snapshot_key", key)
    .maybeSingle();

  if (error) {
    logger.warn("[leaderboard-snapshot] read failed", { key, error: error.message });
    return null;
  }
  return data as SnapshotRow | null;
}

export async function readGlobalSnapshotEntries(
  limit: number,
  offset: number,
): Promise<LeaderboardEntryDTO[] | null> {
  const key = CacheKeys.leaderboardSnapshotKey("global", limit, offset);
  const row = await readSnapshotRow(key);
  if (!row || !isFresh(row.refreshed_at)) return null;
  return parseGlobalPayload(row.payload);
}

export async function readCountrySnapshotEntries(
  limit: number,
): Promise<CountryLeaderboardDTO[] | null> {
  const key = CacheKeys.leaderboardSnapshotKey("country", limit);
  const row = await readSnapshotRow(key);
  if (!row || !isFresh(row.refreshed_at)) return null;
  return parseCountryPayload(row.payload);
}

async function upsertSnapshot(key: string, payload: unknown): Promise<void> {
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { error } = await (admin as SupabaseClient).from("leaderboard_snapshots").upsert(
    {
      snapshot_key: key,
      payload: payload as never,
      refreshed_at: now,
    },
    { onConflict: "snapshot_key" },
  );

  if (error) {
    logger.error("[leaderboard-snapshot] upsert failed", { key, error: error.message });
    throw error;
  }
}

/** Refreshes DB snapshots and warms Redis leaderboard keys. */
export async function refreshLeaderboardSnapshots(): Promise<{
  globalCount: number;
  countryCount: number;
}> {
  const admin = createAdminSupabaseClient();
  const { limit, offset } = LEADERBOARD_SNAPSHOT_TARGETS.global;
  const countryLimit = LEADERBOARD_SNAPSHOT_TARGETS.country.limit;

  const [{ data: globalRows, error: globalError }, { data: countryRows, error: countryError }] =
    await Promise.all([
      admin.rpc("get_global_leaderboard", { p_limit: limit, p_offset: offset }),
      admin.rpc("get_country_leaderboard", { p_limit: countryLimit }),
    ]);

  if (globalError) throw globalError;
  if (countryError) throw countryError;

  const globalEntries = (globalRows ?? []).map(mapLeaderboardEntry);
  const countryEntries = (countryRows ?? []).map(mapCountryLeaderboardEntry);

  const globalKey = CacheKeys.leaderboardSnapshotKey("global", limit, offset);
  const countryKey = CacheKeys.leaderboardSnapshotKey("country", countryLimit);

  await Promise.all([
    upsertSnapshot(globalKey, globalEntries),
    upsertSnapshot(countryKey, countryEntries),
    cacheSet(CacheKeys.leaderboardGlobal(limit, offset), globalEntries, CacheTTL.leaderboardHot),
    cacheSet(CacheKeys.leaderboardCountry(countryLimit), countryEntries, CacheTTL.leaderboardHot),
  ]);

  return { globalCount: globalEntries.length, countryCount: countryEntries.length };
}
