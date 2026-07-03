"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  type GemState,
  type GemTransaction,
  type GemTransactionType,
  earnGems,
  spendGems,
  getTodayEarned,
} from "./gems";
import { DEMO_GEM_STATE } from "./user";
import { useSession } from "./session-context";
import { apiGet } from "./api/client";
import type { GemBalanceDTO } from "./services/gem-balance.service";

type GemContextValue = {
  gemState: GemState;
  /** Belirli bir türden gem kazan */
  earn: (
    type: GemTransactionType,
    customAmount?: number,
    customDescription?: string,
  ) => GemTransaction;
  /** Gem harca (güvenli) */
  spend: (amount: number, description: string) => boolean;
  /** Son işlemi (animasyon için) döndürür */
  lastTransaction: GemTransaction | null;
  /** Bugün kazanılan toplam */
  todayEarned: number;
  /** API'den bakiye yenile */
  refreshBalance?: () => Promise<void>;
};

const GemContext = createContext<GemContextValue | null>(null);

export function GemProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const [gemState, setGemState] = useState<GemState>(DEMO_GEM_STATE);
  const [lastTransaction, setLastTransaction] =
    useState<GemTransaction | null>(null);

  useEffect(() => {
    if (session.isAuthenticated) {
      setGemState((prev) => ({
        ...prev,
        balance: session.gemBalance.balance,
        totalEarned: session.gemBalance.totalEarned,
        totalSpent: session.gemBalance.totalSpent,
      }));
    }
  }, [session.isAuthenticated, session.gemBalance]);

  const earn = useCallback(
    (
      type: GemTransactionType,
      customAmount?: number,
      customDescription?: string,
    ) => {
      const result = earnGems(gemState, type, customAmount, customDescription);
      setGemState(result.state);
      setLastTransaction(result.transaction);
      return result.transaction;
    },
    [gemState],
  );

  const spend = useCallback(
    (amount: number, description: string): boolean => {
      const result = spendGems(gemState, amount, description);
      if (result.success) {
        setGemState(result.state);
        setLastTransaction(
          result.state.history[0] ?? null,
        );
      }
      return result.success;
    },
    [gemState],
  );

  const todayEarned = getTodayEarned(gemState.history);

  const refreshBalance = useCallback(async () => {
    if (!session.isAuthenticated) return;
    const balance = await apiGet<GemBalanceDTO>("/api/gems");
    setGemState((prev) => ({
      ...prev,
      balance: balance.balance,
      totalEarned: balance.totalEarned,
      totalSpent: balance.totalSpent,
    }));
  }, [session.isAuthenticated]);

  return (
    <GemContext.Provider
      value={{
        gemState,
        earn,
        spend,
        lastTransaction,
        todayEarned,
        refreshBalance,
      }}
    >
      {children}
    </GemContext.Provider>
  );
}

export function useGem(): GemContextValue {
  const ctx = useContext(GemContext);
  if (!ctx) {
    throw new Error("useGem must be used within a GemProvider");
  }
  return ctx;
}
