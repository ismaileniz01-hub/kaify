import { createSignedAvatarUrlsBatch } from "@/lib/services/avatar-storage.service";
import { resolveLeaderboardUserId } from "@/lib/privacy/mask-user-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { cachedWithStale } from "@/lib/cache";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { logger } from "@/lib/logger";
import {
  mapCountryLeaderboardEntry,
  mapLeaderboardEntry,
  type CountryLeaderboardDTO,
  type LeaderboardEntryDTO,
} from "@/lib/types/domain.types";
import type { UserRankResult } from "@/lib/types/database.types";
import {
  readCountrySnapshotEntries,
  readGlobalSnapshotEntries,
} from "@/lib/services/leaderboard-snapshot.service";

export type GlobalLeaderboard = {
  leaderboard: LeaderboardEntryDTO[];
  myRank: number | null;
  myStreak: number;
  totalRanked: number;
};

function maskLeaderboardEntries(
  entries: LeaderboardEntryDTO[],
  viewerId?: string,
): LeaderboardEntryDTO[] {
  return entries.map((entry) => ({
    ...entry,
    userId: resolveLeaderboardUserId(entry.userId, viewerId),
  }));
}

async function signLeaderboardAvatars(
  entries: LeaderboardEntryDTO[],
): Promise<LeaderboardEntryDTO[]> {
  const signedMap = await createSignedAvatarUrlsBatch(entries.map((e) => e.avatar));
  return entries.map((entry) => {
    if (!entry.avatar || entry.avatar.startsWith("/")) return entry;
    const signed = signedMap.get(entry.avatar);
    return { ...entry, avatar: signed ?? "" };
  });
}

async function loadGlobalLeaderboardEntries(
  limit: number,
  offset: number,
): Promise<LeaderboardEntryDTO[]> {
  const snapshot = await readGlobalSnapshotEntries(limit, offset);
  if (snapshot) return snapshot;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_global_leaderboard", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    logger.error("[leaderboard.service] global error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Sıralama alınamadı.");
  }
  return (data ?? []).map(mapLeaderboardEntry);
}

async function loadCountryLeaderboardEntries(
  limit: number,
): Promise<CountryLeaderboardDTO[]> {
  const snapshot = await readCountrySnapshotEntries(limit);
  if (snapshot) return snapshot;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_country_leaderboard", {
    p_limit: limit,
  });
  if (error) {
    logger.error("[leaderboard.service] country error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Ülke sıralaması alınamadı.");
  }
  return (data ?? []).map(mapCountryLeaderboardEntry);
}

/** Public global leaderboard (anon-safe RPC). Used by legacy/demo routes. */
export async function getPublicGlobalLeaderboard(params: {
  limit: number;
}): Promise<{
  leaderboard: LeaderboardEntryDTO[];
  totalUsers: number;
}> {
  const entries = await cachedWithStale(
    CacheKeys.leaderboardGlobal(params.limit, 0),
    CacheTTL.leaderboardHot,
    CacheTTL.leaderboardStale,
    async () => loadGlobalLeaderboardEntries(params.limit, 0),
  );

  return {
    leaderboard: await signLeaderboardAvatars(maskLeaderboardEntries(entries)),
    totalUsers: entries.length,
  };
}
/** Public country leaderboard (anon-safe RPC). Used by legacy/demo routes. */
export async function getPublicCountryLeaderboard(params: {
  limit: number;
}): Promise<CountryLeaderboard> {
  return getCountryLeaderboard(params);
}

/** Top users by current streak + the caller's own rank. */
export async function getGlobalLeaderboard(params: {
  limit: number;
  offset: number;
  viewerId: string;
}): Promise<GlobalLeaderboard> {
  const supabase = await createServerSupabaseClient();

  const [listEntries, rankResult] = await Promise.all([
    cachedWithStale(
      CacheKeys.leaderboardGlobal(params.limit, params.offset),
      CacheTTL.leaderboardHot,
      CacheTTL.leaderboardStale,
      async () => loadGlobalLeaderboardEntries(params.limit, params.offset),
    ),
    supabase.rpc("get_user_rank", {}),
  ]);

  const rank: UserRankResult | null = rankResult.error ? null : rankResult.data;

  return {
    leaderboard: await signLeaderboardAvatars(
      maskLeaderboardEntries(listEntries, params.viewerId),
    ),
    myRank: rank?.rank ?? null,
    myStreak: rank?.current_streak ?? 0,
    totalRanked: rank?.total_ranked ?? 0,
  };
}
export type CountryLeaderboard = {
  leaderboard: CountryLeaderboardDTO[];
};

/** Countries ranked by aggregate streak. */
export async function getCountryLeaderboard(params: {
  limit: number;
}): Promise<CountryLeaderboard> {
  const entries = await cachedWithStale(
    CacheKeys.leaderboardCountry(params.limit),
    CacheTTL.leaderboardHot,
    CacheTTL.leaderboardStale,
    async () => loadCountryLeaderboardEntries(params.limit),
  );

  return {
    leaderboard: entries,
  };
}
