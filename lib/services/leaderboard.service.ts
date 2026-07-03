import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { cachedWithStale } from "@/lib/cache";
import { logger } from "@/lib/logger";
import {
  mapCountryLeaderboardEntry,
  mapLeaderboardEntry,
  type CountryLeaderboardDTO,
  type LeaderboardEntryDTO,
} from "@/lib/types/domain.types";
import type { UserRankResult } from "@/lib/types/database.types";

export type GlobalLeaderboard = {
  leaderboard: LeaderboardEntryDTO[];
  myRank: number | null;
  myStreak: number;
  totalRanked: number;
};

/** Public global leaderboard (anon-safe RPC). Used by legacy/demo routes. */
export async function getPublicGlobalLeaderboard(params: {
  limit: number;
}): Promise<{
  leaderboard: LeaderboardEntryDTO[];
  totalUsers: number;
}> {
  const entries = await cachedWithStale(
    `lb:global:v1:${params.limit}:0`,
    60,
    3600,
    async () => {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.rpc("get_global_leaderboard", {
        p_limit: params.limit,
        p_offset: 0,
      });
      if (error) {
        logger.error("[leaderboard.service] public global error", { error: error.message });
        throw new ApiError("INTERNAL_ERROR", "Sıralama alınamadı.");
      }
      return (data ?? []).map(mapLeaderboardEntry);
    },
  );

  return {
    leaderboard: entries,
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
}): Promise<GlobalLeaderboard> {
  const supabase = await createServerSupabaseClient();

  // The ranked list is identical for every user → cache it (shared).
  // The caller's own rank is user-specific → always fetched live.
  const [listEntries, rankResult] = await Promise.all([
    cachedWithStale(`lb:global:v1:${params.limit}:${params.offset}`, 60, 3600, async () => {
      const { data, error } = await supabase.rpc("get_global_leaderboard", {
        p_limit: params.limit,
        p_offset: params.offset,
      });
      if (error) {
        logger.error("[leaderboard.service] global error", { error: error.message });
        throw new ApiError("INTERNAL_ERROR", "Sıralama alınamadı.");
      }
      return (data ?? []).map(mapLeaderboardEntry);
    }),
    supabase.rpc("get_user_rank", {}),
  ]);

  const rank: UserRankResult | null = rankResult.error ? null : rankResult.data;

  return {
    leaderboard: listEntries,
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
    `lb:country:v1:${params.limit}`,
    60,
    3600,
    async () => {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.rpc("get_country_leaderboard", {
        p_limit: params.limit,
      });
      if (error) {
        logger.error("[leaderboard.service] country error", { error: error.message });
        throw new ApiError("INTERNAL_ERROR", "Ülke sıralaması alınamadı.");
      }
      return (data ?? []).map(mapCountryLeaderboardEntry);
    },
  );

  return {
    leaderboard: entries,
  };
}
