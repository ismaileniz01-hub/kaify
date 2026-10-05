import { resolveIsHubAdmin } from "@/lib/auth/admin-access";
import { getMaterializedGemBalance } from "@/lib/services/gem-balance.service";
import { getFastHomeData, type HomeDTO } from "@/lib/services/home.service";
import { getKaiState, type KaiStateDTO } from "@/lib/services/kai-state.service";
import { getOwnProfile } from "@/lib/services/profile.service";
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
 * App-open bundle. Only the rows the welcome screen paints.
 * The gem ledger aggregate, referral counts, avatar signing, and the full
 * home history scan stay off this path.
 */
export async function getSessionBundle(userId: string): Promise<SessionBundleDTO> {
  const profilePromise = getOwnProfile(userId, { signAvatar: false });
  const streakPromise = getStreakStatus(userId);
  const homePromise = Promise.all([profilePromise, streakPromise]).then(([profile, streak]) =>
    getFastHomeData(userId, profile, streak),
  );
  const isAdminPromise = profilePromise.then((profile) =>
    profile.role === "admin" ? resolveIsHubAdmin(userId) : Promise.resolve(false),
  );

  const [profile, gems, streak, kai, isAdmin, home] = await Promise.all([
    profilePromise,
    getMaterializedGemBalance(userId),
    streakPromise,
    getKaiState(userId),
    isAdminPromise,
    homePromise,
  ]);

  return {
    profile,
    isAdmin,
    gems,
    streak,
    referral: { referralCode: profile.referralCode },
    home,
    kai,
  };
}
