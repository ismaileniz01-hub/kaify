"use client";

import { createContext, useContext } from "react";
import type { UserProfile } from "@/lib/user";
import type { ProfileDTO } from "@/lib/types/domain.types";
import type { CheckInDTO } from "@/lib/types/domain.types";
import type { HomeDTO } from "@/lib/services/home.service";
import type { GemBalanceDTO } from "@/lib/services/gem-balance.service";
import type { StreakStatusDTO } from "@/lib/services/streak-status.service";
import type { KaiStateDTO } from "@/lib/services/kai-state.service";

export type SessionAuthValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  isPreviewMode: boolean;
  isAdmin: boolean;
  sessionError: boolean;
  clearSessionError: () => void;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<boolean>;
};

export type SessionDataValue = {
  profile: ProfileDTO | null;
  userProfile: UserProfile;
  displayName: string;
  gemBalance: GemBalanceDTO;
  streak: StreakStatusDTO;
  home: HomeDTO | null;
  kai: KaiStateDTO | null;
  referralCode: string;
  refreshHome: (locale?: string) => Promise<void>;
  applyGemBalance: (balance: number) => void;
  applyChestClaim: (balances: { gemBalance: number; freezieBalance: number }) => void;
  updateProfile: (form: UserProfile) => Promise<void>;
  checkIn: () => Promise<CheckInDTO>;
};

export type SessionContextValue = SessionAuthValue & SessionDataValue;

export const SessionContext = createContext<SessionContextValue | null>(null);
export const SessionAuthContext = createContext<SessionAuthValue | null>(null);
export const SessionDataContext = createContext<SessionDataValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}

export function useSessionAuth(): SessionAuthValue {
  const ctx = useContext(SessionAuthContext);
  if (!ctx) {
    throw new Error("useSessionAuth must be used within SessionProvider");
  }
  return ctx;
}

export function useSessionData(): SessionDataValue {
  const ctx = useContext(SessionDataContext);
  if (!ctx) {
    throw new Error("useSessionData must be used within SessionProvider");
  }
  return ctx;
}

/** Safe on marketing routes that omit SessionProvider (guest defaults). */
export function useSessionOptional(): SessionContextValue | null {
  return useContext(SessionContext);
}
