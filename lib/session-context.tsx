"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  SessionAuthContext,
  SessionContext,
  SessionDataContext,
  type SessionAuthValue,
  type SessionContextValue,
  type SessionDataValue,
} from "@/lib/session-contexts";
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
import type { KaiStateDTO } from "@/lib/services/kai-state.service";
import type { SessionBundleDTO } from "@/lib/services/session.service";
import type { ProfileUpdateInput } from "@/lib/validations/profile.schema";
import { syncFreezieBalanceFromServer } from "@/lib/freezie";
import { clearAuthLocalState, signOutUser } from "@/lib/auth/logout";
import { hasBrowserAuthCookie } from "@/lib/auth/browser-auth-hint";
import { alreadyCheckedInOnLocalDay } from "@/lib/check-in-gate";

const DEFAULT_GEMS: GemBalanceDTO = {
  balance: 0,
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

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEMO_USER_PROFILE);
  const [gemBalance, setGemBalance] = useState<GemBalanceDTO>(DEFAULT_GEMS);
  const [streak, setStreak] = useState<StreakStatusDTO>(DEFAULT_STREAK);
  const [home, setHome] = useState<HomeDTO | null>(null);
  const [kai, setKai] = useState<KaiStateDTO | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  const clearSessionError = useCallback(() => setSessionError(false), []);

  const applyGuestState = useCallback(() => {
    setIsAuthenticated(false);
    setIsPreviewMode(true);
    setProfile(null);
    setUserProfile(DEMO_USER_PROFILE);
    setGemBalance(DEFAULT_GEMS);
    setStreak(DEFAULT_STREAK);
    setHome(null);
    setKai(null);
    setReferralCode("");
    setIsAdmin(false);
    setSessionError(false);
  }, []);

  const refreshSession = useCallback(async () => {
    const isBackgroundRefresh = hasHydrated && isAuthenticated;
    if (!isBackgroundRefresh) {
      setIsLoading(true);
    }
    setSessionError(false);
    try {
      const bundle = await apiGet<SessionBundleDTO>("/api/session");
      setIsAuthenticated(true);
      setIsPreviewMode(false);
      setProfile(bundle.profile);
      setIsAdmin(bundle.isAdmin);
      setUserProfile(profileDtoToUserProfile(bundle.profile));
      setGemBalance(bundle.gems);
      setStreak(bundle.streak);
      syncFreezieBalanceFromServer(bundle.streak.freezieBalance);
      setReferralCode(bundle.referral.referralCode);
      setHome(bundle.home);
      setKai(bundle.kai);

      if (
        !alreadyCheckedInOnLocalDay(
          bundle.streak.lastCheckInDate,
          bundle.profile.timezone ?? "UTC",
        )
      ) {
        void apiPost<CheckInDTO>("/api/check-in")
          .then((result) => {
            setGemBalance((prev) => ({ ...prev, balance: result.gemBalance }));
            setStreak((prev) => ({
              ...prev,
              currentStreak: result.currentStreak,
              longestStreak: result.longestStreak,
              freezieBalance: result.freezieBalance,
              lastCheckInDate: result.checkedInDate,
              kaiUnlockedLevel: result.kaiUnlockedLevel,
            }));
            syncFreezieBalanceFromServer(result.freezieBalance);
          })
          .catch(() => undefined);
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "UNAUTHORIZED") {
        applyGuestState();
      } else {
        setSessionError(true);
      }
    } finally {
      setIsLoading(false);
      setHasHydrated(true);
    }
  }, [hasHydrated, isAuthenticated, applyGuestState]);

  const signOut = useCallback(async () => {
    const result = await signOutUser();
    applyGuestState();
    setIsLoading(false);
    setHasHydrated(true);
    return result.ok;
  }, [applyGuestState]);

  useEffect(() => {
    const supabase = tryCreateBrowserSupabaseClient();

    if (!supabase) {
      if (hasBrowserAuthCookie()) {
        void refreshSession();
      } else {
        applyGuestState();
        setIsLoading(false);
        setHasHydrated(true);
      }
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearAuthLocalState();
        applyGuestState();
        return;
      }
      // TOKEN_REFRESHED already updates the client JWT — skip full /api/session + check-in cascade.
      if (event === "SIGNED_IN") {
        void refreshSession();
      }
    });

    if (hasBrowserAuthCookie()) {
      void refreshSession();
    } else {
      applyGuestState();
      setIsLoading(false);
      setHasHydrated(true);
    }

    return () => subscription.unsubscribe();
  }, [applyGuestState, refreshSession]);

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

  const applyChestClaim = useCallback(
    (balances: { gemBalance: number; freezieBalance: number }) => {
      setGemBalance((prev) => ({ ...prev, balance: balances.gemBalance }));
      setStreak((prev) => ({ ...prev, freezieBalance: balances.freezieBalance }));
      syncFreezieBalanceFromServer(balances.freezieBalance);
    },
    [],
  );

  const refreshHome = useCallback(async (locale?: string) => {
    if (!isAuthenticated) return;
    try {
      const qs = locale ? `?locale=${encodeURIComponent(locale)}` : "";
      const homeData = await apiGet<HomeDTO>(`/api/home${qs}`);
      setHome(homeData);
    } catch {
      // non-fatal
    }
  }, [isAuthenticated]);

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
    syncFreezieBalanceFromServer(result.freezieBalance);
    void apiGet<HomeDTO>("/api/home")
      .then((homeData) => setHome(homeData))
      .catch(() => undefined);
    return result;
  }, []);

  const displayName = useMemo(
    () =>
      isAuthenticated && profile?.displayName
        ? profile.displayName
        : home?.displayName ?? DEMO_USER_NAME,
    [isAuthenticated, profile, home],
  );

  const authValue = useMemo<SessionAuthValue>(
    () => ({
      isLoading,
      isAuthenticated,
      isPreviewMode,
      isAdmin,
      sessionError,
      clearSessionError,
      refreshSession,
      signOut,
    }),
    [
      isLoading,
      isAuthenticated,
      isPreviewMode,
      isAdmin,
      sessionError,
      clearSessionError,
      refreshSession,
      signOut,
    ],
  );

  const dataValue = useMemo<SessionDataValue>(
    () => ({
      profile,
      userProfile,
      displayName,
      gemBalance,
      streak,
      home,
      kai,
      referralCode,
      refreshHome,
      applyChestClaim,
      updateProfile,
      checkIn,
    }),
    [
      profile,
      userProfile,
      displayName,
      gemBalance,
      streak,
      home,
      kai,
      referralCode,
      refreshHome,
      applyChestClaim,
      updateProfile,
      checkIn,
    ],
  );

  const value = useMemo<SessionContextValue>(
    () => ({ ...authValue, ...dataValue }),
    [authValue, dataValue],
  );

  return (
    <SessionAuthContext.Provider value={authValue}>
      <SessionDataContext.Provider value={dataValue}>
        <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
      </SessionDataContext.Provider>
    </SessionAuthContext.Provider>
  );
}

export {
  useSession,
  useSessionAuth,
  useSessionData,
  useSessionOptional,
} from "@/lib/session-contexts";
