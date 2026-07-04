"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  apiGet,
  apiPatch,
  apiPost,
  ApiClientError,
} from "@/lib/api/client";
import { profileDtoToUserProfile, userProfileToUpdateInput } from "@/lib/profile-mapper";
import {
  DEMO_USER_PROFILE,
  DEMO_USER_NAME,
  type UserProfile,
} from "@/lib/user";
import type { ProfileDTO } from "@/lib/types/domain.types";
import type { CheckInDTO } from "@/lib/types/domain.types";
import type { HomeDTO } from "@/lib/services/home.service";
import type { GemBalanceDTO } from "@/lib/services/gem-balance.service";
import type { StreakStatusDTO } from "@/lib/services/streak-status.service";
import type { ProfileUpdateInput } from "@/lib/validations/profile.schema";

type SessionContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  isPreviewMode: boolean;
  sessionError: boolean;
  clearSessionError: () => void;
  profile: ProfileDTO | null;
  userProfile: UserProfile;
  displayName: string;
  gemBalance: GemBalanceDTO;
  streak: StreakStatusDTO;
  home: HomeDTO | null;
  referralCode: string;
  refreshSession: () => Promise<void>;
  updateProfile: (form: UserProfile) => Promise<void>;
  checkIn: () => Promise<CheckInDTO>;
};

const DEFAULT_GEMS: GemBalanceDTO = {
  balance: 1000,
  totalEarned: 0,
  totalSpent: 0,
};

const DEFAULT_STREAK: StreakStatusDTO = {
  currentStreak: 0,
  longestStreak: 0,
  freezieBalance: 0,
  lastCheckInDate: null,
  kaiUnlockedLevel: 1,
};

const SessionContext = createContext<SessionContextValue | null>(null);

async function loadCoreSession(): Promise<{
  profile: ProfileDTO;
  gems: GemBalanceDTO;
  streak: StreakStatusDTO;
  referral: { referralCode: string };
}> {
  const [profile, gems, streak, referral] = await Promise.all([
    apiGet<ProfileDTO>("/api/profile"),
    apiGet<GemBalanceDTO>("/api/gems"),
    apiGet<StreakStatusDTO>("/api/streak"),
    apiGet<{ referralCode: string }>("/api/referral"),
  ]);
  return { profile, gems, streak, referral };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEMO_USER_PROFILE);
  const [gemBalance, setGemBalance] = useState<GemBalanceDTO>(DEFAULT_GEMS);
  const [streak, setStreak] = useState<StreakStatusDTO>(DEFAULT_STREAK);
  const [home, setHome] = useState<HomeDTO | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [sessionError, setSessionError] = useState(false);

  const clearSessionError = useCallback(() => setSessionError(false), []);

  const refreshSession = useCallback(async () => {
    const isBackgroundRefresh = hasHydrated && isAuthenticated;
    if (!isBackgroundRefresh) {
      setIsLoading(true);
    }
    setSessionError(false);
    try {
      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) {
        setIsAuthenticated(false);
        setIsPreviewMode(true);
        setProfile(null);
        setUserProfile(DEMO_USER_PROFILE);
        setGemBalance(DEFAULT_GEMS);
        setStreak(DEFAULT_STREAK);
        setHome(null);
        setReferralCode("");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setIsAuthenticated(false);
        setIsPreviewMode(true);
        setProfile(null);
        setUserProfile(DEMO_USER_PROFILE);
        setGemBalance(DEFAULT_GEMS);
        setStreak(DEFAULT_STREAK);
        setHome(null);
        setReferralCode("");
        return;
      }

      const bundle = await loadCoreSession();
      setIsAuthenticated(true);
      setIsPreviewMode(false);
      setProfile(bundle.profile);
      setUserProfile(profileDtoToUserProfile(bundle.profile));
      setGemBalance(bundle.gems);
      setStreak(bundle.streak);
      setReferralCode(bundle.referral.referralCode);

      void apiGet<HomeDTO>("/api/home")
        .then((homeData) => setHome(homeData))
        .catch(() => setHome(null));
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "UNAUTHORIZED") {
        setIsAuthenticated(false);
        setIsPreviewMode(true);
      } else {
        setSessionError(true);
      }
    } finally {
      setIsLoading(false);
      setHasHydrated(true);
    }
  }, [hasHydrated, isAuthenticated]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const updateProfile = useCallback(
    async (form: UserProfile) => {
      if (!profile || !isAuthenticated) {
        setUserProfile(form);
        return;
      }

      let avatarUrl = form.avatar;
      if (form.avatar.startsWith("data:image")) {
        const match = form.avatar.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          const mime = match[1] as "image/jpeg" | "image/png" | "image/webp";
          const uploaded = await apiPost<{ avatarUrl: string | null }>(
            "/api/profile/avatar",
            { imageBase64: match[2], mimeType: mime },
          );
          if (uploaded.avatarUrl) avatarUrl = uploaded.avatarUrl;
        }
      }

      const payload: ProfileUpdateInput = userProfileToUpdateInput(
        { ...form, avatar: avatarUrl },
        profile,
      );
      const updated = await apiPatch<ProfileDTO>("/api/profile", payload);
      setProfile(updated);
      setUserProfile(profileDtoToUserProfile(updated));
    },
    [profile, isAuthenticated],
  );

  const checkIn = useCallback(async () => {
    const result = await apiPost<CheckInDTO>("/api/check-in");
    setGemBalance((prev) => ({ ...prev, balance: result.gemBalance }));
    setStreak((prev) => ({
      ...prev,
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
      freezieBalance: result.freezieBalance,
      lastCheckInDate: result.checkedInDate,
      kaiUnlockedLevel: result.kaiUnlockedLevel,
    }));
    await refreshSession();
    return result;
  }, [refreshSession]);

  const displayName = useMemo(
    () =>
      isAuthenticated && profile?.displayName
        ? profile.displayName
        : home?.displayName ?? DEMO_USER_NAME,
    [isAuthenticated, profile, home],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      isLoading,
      isAuthenticated,
      isPreviewMode,
      sessionError,
      clearSessionError,
      profile,
      userProfile,
      displayName,
      gemBalance,
      streak,
      home,
      referralCode,
      refreshSession,
      updateProfile,
      checkIn,
    }),
    [
      isLoading,
      isAuthenticated,
      isPreviewMode,
      sessionError,
      clearSessionError,
      profile,
      userProfile,
      displayName,
      gemBalance,
      streak,
      home,
      referralCode,
      refreshSession,
      updateProfile,
      checkIn,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
