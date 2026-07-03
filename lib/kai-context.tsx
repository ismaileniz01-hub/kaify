"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getKaiLevel, KAI_LEVEL_AVATARS, type KaiLevel } from "@/lib/kai-level";

export type AuraColor = "default" | "blue" | "red" | "green" | "pink" | "purple" | "gold" | "white" | "orange" | "indigo" | "electric";

interface KaiContextType {
  /** localStorage'daki en yüksek unlock edilmiş Kai level'ı */
  unlockedLevel: KaiLevel;
  /** Mevcut streak'e göre hesaplanan level */
  currentLevel: KaiLevel;
  /** Unlock edilmiş level'a göre avatar yolu */
  avatar: string;
  /** Level unlock et (StreakRoad'daki CLAIM sonrası çağrılır) */
  unlockLevel: (level: KaiLevel) => void;
  /** Streak değerini güncelle (chat sayfasından vs.) */
  setStreak: (streak: number) => void;
  /** Marketten seçili aktif aura rengi */
  auraColor: AuraColor;
  /** Efekt rengini ayarla (Uygula butonu) */
  setAuraColor: (color: AuraColor) => void;
  /** Satın alınmış efektler */
  ownedEffects: AuraColor[];
  /** Efekt satın al (markette kullan) */
  purchaseEffect: (color: AuraColor) => void;
  /** Sunucudan owned + aura senkronize et */
  syncFromServer: (ownedIds: string[], activeAura: string) => void;
}

const KaiContext = createContext<KaiContextType | null>(null);

const STORAGE_KEY = "kai_level";
const AURA_STORAGE_KEY = "kai_aura_color";
const OWNED_EFFECTS_KEY = "kai_owned_effects";

function getStoredLevel(): KaiLevel {
  if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10) as KaiLevel;
    if (parsed >= 1 && parsed <= 4) return parsed;
  }
  return 1;
}

function getStoredAuraColor(): AuraColor {
  if (typeof window === "undefined") return "default";
  const stored = localStorage.getItem(AURA_STORAGE_KEY);
  const validColors: AuraColor[] = ["blue", "red", "green", "pink", "purple", "gold", "white", "orange", "indigo", "electric"];
  if (validColors.includes(stored as AuraColor)) {
    return stored as AuraColor;
  }
  return "default";
}

function getStoredOwnedEffects(): AuraColor[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(OWNED_EFFECTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AuraColor[];
      return parsed.filter((c) => c !== "default");
    }
  } catch {}
  return [];
}

export function KaiProvider({ children, initialStreak = 0 }: { children: ReactNode; initialStreak?: number }) {
  const [unlockedLevel, setUnlockedLevel] = useState<KaiLevel>(1);
  const [streak, setStreak] = useState(initialStreak);
  const [auraColor, setAuraColorState] = useState<AuraColor>("default");
  const [ownedEffects, setOwnedEffects] = useState<AuraColor[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUnlockedLevel(getStoredLevel());
    setAuraColorState(getStoredAuraColor());
    setOwnedEffects(getStoredOwnedEffects());
    setMounted(true);
  }, []);

  const unlockLevel = useCallback((level: KaiLevel) => {
    localStorage.setItem(STORAGE_KEY, String(level));
    setUnlockedLevel(level);
  }, []);

  const setAuraColor = useCallback((color: AuraColor) => {
    localStorage.setItem(AURA_STORAGE_KEY, color);
    setAuraColorState(color);
  }, []);

  const purchaseEffect = useCallback((color: AuraColor) => {
    if (color === "default") return;
    setOwnedEffects((prev) => {
      const updated = [...prev.filter((c) => c !== color), color];
      localStorage.setItem(OWNED_EFFECTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const syncFromServer = useCallback((ownedIds: string[], activeAura: string) => {
    const owned = ownedIds.filter((id) => id !== "default") as AuraColor[];
    setOwnedEffects(owned);
    localStorage.setItem(OWNED_EFFECTS_KEY, JSON.stringify(owned));
    const aura = (activeAura === "default" ? "default" : activeAura) as AuraColor;
    setAuraColorState(aura);
    localStorage.setItem(AURA_STORAGE_KEY, aura);
  }, []);

  const currentLevel = getKaiLevel(streak);
  // Avatar unlock edilmiş en yüksek level'a göre gösterilir
  // unlockedLevel, StreakRoad'daki CLAIM sonrası güncellenir
  const avatar = KAI_LEVEL_AVATARS[unlockedLevel];

  if (!mounted) {
    return (
      <KaiContext.Provider
        value={{
          unlockedLevel: 1,
          currentLevel: 1,
          avatar: KAI_LEVEL_AVATARS[1],
          unlockLevel,
          setStreak,
          auraColor: "default",
          setAuraColor,
          ownedEffects: [],
          purchaseEffect,
          syncFromServer,
        }}
      >
        {children}
      </KaiContext.Provider>
    );
  }

  return (
    <KaiContext.Provider
      value={{
        unlockedLevel,
        currentLevel,
        avatar,
        unlockLevel,
        setStreak,
        auraColor,
        setAuraColor,
        ownedEffects,
        purchaseEffect,
        syncFromServer,
      }}
    >
      {children}
    </KaiContext.Provider>
  );
}

export function useKai(): KaiContextType {
  const ctx = useContext(KaiContext);
  if (!ctx) throw new Error("useKai must be used within a KaiProvider");
  return ctx;
}
