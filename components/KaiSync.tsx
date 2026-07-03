"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/session-context";
import { useKai } from "@/lib/kai-context";
import { apiGet } from "@/lib/api/client";
import type { KaiStateDTO } from "@/lib/services/kai-state.service";
import type { KaiLevel } from "@/lib/kai-level";

/** Syncs Kai aura/owned effects from the server after login. */
export function KaiSync() {
  const { isAuthenticated, isLoading, streak } = useSession();
  const { syncFromServer, unlockLevel, setStreak } = useKai();

  useEffect(() => {
    setStreak(streak.currentStreak);
  }, [streak.currentStreak, setStreak]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    apiGet<KaiStateDTO>("/api/kai")
      .then((state) => {
        syncFromServer(state.ownedEffectIds, state.activeAura);
        const level = Math.min(4, Math.max(1, state.unlockedLevel)) as KaiLevel;
        unlockLevel(level);
      })
      .catch(() => {
        // Non-fatal — local cache remains usable
      });
  }, [isAuthenticated, isLoading, syncFromServer, unlockLevel]);

  return null;
}
