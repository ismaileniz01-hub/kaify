import { cachedWithStale } from "@/lib/cache";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
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
 */
export async function getSessionBundle(userId: string): Promise<SessionBundleDTO> {
  const admin = createAdminSupabaseClient();
  const [profile, gems, streak, referral, kai, home, roleRow] = await Promise.all([
    getOwnProfile(userId),
    getGemBalance(userId),
    getStreakStatus(userId),
    getReferralSummary(userId),
    getKaiState(userId),
    cachedWithStale(
      CacheKeys.homeBundle(userId),
      CacheTTL.homeBundle,
      CacheTTL.homeBundleStale,
      () => getHomeData(userId),
    ),
    admin.from("profiles").select("role").eq("id", userId).maybeSingle(),
  ]);

  return {
    profile,
    isAdmin: roleRow.data?.role === "admin",
    gems,
    streak,
    referral: { referralCode: referral.referralCode },
    home,
    kai,
  };
}
