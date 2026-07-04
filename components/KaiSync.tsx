"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/session-context";
import { useKai } from "@/lib/kai-context";
import { apiGet } from "@/lib/api/client";
import type { KaiStateDTO } from "@/lib/services/kai-state.service";
import type { KaiLevel } from "@/lib/kai-level";

const SYNC_RETRY_MS = 5_000;

/** Syncs Kai aura/owned effects from the server after login. */
export function KaiSync() {
  const { isAuthenticated, isLoading, streak } = useSession();
  const { syncFromServer, unlockLevel, setStreak, resetGuestState } = useKai();
  const syncedRef = useRef(false);
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    setStreak(streak.currentStreak);
  }, [streak.currentStreak, setStreak]);

  useEffect(() => {
    if (wasAuthenticatedRef.current && !isAuthenticated && !isLoading) {
      resetGuestState();
      syncedRef.current = false;
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, isLoading, resetGuestState]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      syncedRef.current = false;
      return;
    }

    let cancelled = false;
    syncedRef.current = false;

    const applyState = (state: KaiStateDTO) => {
      if (cancelled) return;
      syncFromServer(state.ownedEffectIds, state.activeAura);
      const level = Math.min(4, Math.max(1, state.unlockedLevel)) as KaiLevel;
      unlockLevel(level);
      syncedRef.current = true;
    };

    const sync = () =>
      apiGet<KaiStateDTO>("/api/kai")
        .then(applyState)
        .catch(() => {
          syncedRef.current = false;
        });

    void sync();

    const retry = window.setInterval(() => {
      if (syncedRef.current || cancelled) {
        window.clearInterval(retry);
        return;
      }
      void sync();
    }, SYNC_RETRY_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible" && isAuthenticated) {
        void sync();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(retry);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAuthenticated, isLoading, syncFromServer, unlockLevel]);

  return null;
}
