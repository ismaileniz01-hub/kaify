import { cached, cachedWithStale } from "@/lib/cache";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { resolveIsHubAdmin } from "@/lib/auth/admin-access";
import { getGemBalance } from "@/lib/services/gem-balance.service";
import { getHomeData, type HomeDTO } from "@/lib/services/home.service";
import { getKaiState, type KaiStateDTO } from "@/lib/services/kai-state.service";
import { getOwnProfile } from "@/lib/services/profile.service";
import { getReferralSummary } from "@/lib/services/referral.service";
import { getStreakStatus } from "@/lib/services/streak-status.service";
import type { ProfileDTO } from "@/lib/types/domain.types";
import type { GemBalanceDTO } from "@/lib/services/gem-balance.service";
import type { StreakStatusDTO } from "@/lib/services/streak-status.service";

export type SessionBundleDTO = {
  profile: ProfileDTO;
  isAdmin: boolean;
  gems: GemBalanceDTO;
  streak: StreakStatusDTO;
  referral: { referralCode: string };
  home: HomeDTO;
  kai: KaiStateDTO;
};

/**
 * Single round-trip bootstrap: replaces 6 parallel client calls
 * (profile, gems, streak, referral, home, kai).
 * Profile + streak are fetched once and reused for the home bundle.
 * Gems / streak / kai use a short Redis TTL to blunt auth refresh storms.
 */
export async function getSessionBundle(userId: string): Promise<SessionBundleDTO> {
  const [profile, gems, streak, referral, kai, isAdmin] = await Promise.all([
    getOwnProfile(userId),
    cached(CacheKeys.sessionGems(userId), CacheTTL.sessionSlice, () =>
      getGemBalance(userId),
    ),
    cached(CacheKeys.sessionStreak(userId), CacheTTL.sessionSlice, () =>
      getStreakStatus(userId),
    ),
    getReferralSummary(userId),
    cached(CacheKeys.sessionKai(userId), CacheTTL.sessionSlice, () =>
      getKaiState(userId),
    ),
    resolveIsHubAdmin(userId),
  ]);

  const home = await cachedWithStale(
    CacheKeys.homeBundle(userId),
    CacheTTL.homeBundle,
    CacheTTL.homeBundleStale,
    () => getHomeData(userId, undefined, { profile, streakStatus: streak }),
  );

  return {
    profile,
    isAdmin,
    gems,
    streak,
    referral: { referralCode: referral.referralCode },
    home,
    kai,
  };
}
