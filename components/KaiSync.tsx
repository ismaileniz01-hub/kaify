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
  const { isAuthenticated, isLoading, streak, kai } = useSession();
  const { syncFromServer, unlockLevel, setStreak, resetGuestState } = useKai();
  const syncedRef = useRef(false);
  const wasAuthenticatedRef = useRef(false);
  const appliedKaiKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setStreak(streak.currentStreak);
  }, [streak.currentStreak, setStreak]);

  useEffect(() => {
    if (wasAuthenticatedRef.current && !isAuthenticated && !isLoading) {
      resetGuestState();
      syncedRef.current = false;
      appliedKaiKeyRef.current = null;
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, isLoading, resetGuestState]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      syncedRef.current = false;
      appliedKaiKeyRef.current = null;
      return;
    }

    let cancelled = false;

    const applyState = (state: KaiStateDTO) => {
      if (cancelled) return;
      const key = `${state.unlockedLevel}|${state.activeAura}|${state.ownedEffectIds.join(",")}`;
      if (appliedKaiKeyRef.current === key) {
        syncedRef.current = true;
        return;
      }
      appliedKaiKeyRef.current = key;
      syncFromServer(state.ownedEffectIds, state.activeAura);
      const level = Math.min(4, Math.max(1, state.unlockedLevel)) as KaiLevel;
      unlockLevel(level);
      syncedRef.current = true;
    };

    // Session bundle already includes kai — apply once, no poll/visibility refetch.
    if (kai) {
      applyState(kai);
      return () => {
        cancelled = true;
      };
    }

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
      if (
        document.visibilityState === "visible" &&
        isAuthenticated &&
        !syncedRef.current
      ) {
        void sync();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(retry);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAuthenticated, isLoading, syncFromServer, unlockLevel, kai]);

  return null;
}
