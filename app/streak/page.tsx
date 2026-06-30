"use client";

import Link from "next/link";
import { ArrowLeft, Image as ImageIcon, Snowflake } from "lucide-react";
import { StreakRoad } from "@/components/StreakRoad";
import { StreakCard } from "@/components/StreakCard";
import { GemBalance } from "@/components/GemBalance";
import { FreezieBalance } from "@/components/FreezieBalance";
import { useGem } from "@/lib/gem-context";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { useEffect, useState, useMemo } from "react";
import { getFreezieBalance, claimFreezie, autoProtectStreak, updateLastVisit } from "@/lib/freezie";

export default function StreakPage() {
  const { gemState } = useGem();
  const { unlockedLevel, unlockLevel } = useKai();
  const { t } = useLang();
  const [showCard, setShowCard] = useState(false);
  const [freezieKey, setFreezieKey] = useState(0);

  // Test için streak 28'den başlasın (7'nin katı → freezie kazanılır)
  useEffect(() => {
    localStorage.setItem("kai_level", "1");
    unlockLevel(1);
    localStorage.setItem("streak_claimed_milestones", "[]");
    localStorage.setItem("streak_claimed_stations", "[]");
    localStorage.setItem("kaify-freezie-claimed-days", "[]");
    localStorage.removeItem("kaify-freezie-balance");
    // Tüm 7'nin katı günler için freezie claim et
    const freezieDays = [7, 14, 21, 28];
    freezieDays.forEach((day) => {
      const result = claimFreezie(day);
      console.log(`Freezie claimed for day ${day}:`, result);
    });
    updateLastVisit();
    setFreezieKey((k) => k + 1);
  }, [unlockLevel]);

  const currentStreak = 31;

  const [particles, setParticles] = useState<{left: number; top: number; color: string; shadow: string; duration: number; delay: number}[]>([]);

  useEffect(() => {
    setParticles(
      [...Array(20)].map((_, i) => ({
        left: 5 + Math.random() * 90,
        top: 5 + Math.random() * 90,
        color: i % 3 === 0 ? "rgba(251,146,60,0.4)" : i % 3 === 1 ? "rgba(168,85,247,0.3)" : "rgba(251,191,36,0.3)",
        shadow: i % 3 === 0 ? "rgba(251,146,60,0.3)" : i % 3 === 1 ? "rgba(168,85,247,0.3)" : "rgba(251,191,36,0.3)",
        duration: 3 + Math.random() * 4,
        delay: Math.random() * 5,
      }))
    );
  }, []);

  return (
    <div className="phone-shell relative flex flex-col" style={{
      background: `
        radial-gradient(ellipse 100% 60% at 50% -10%, rgba(251,146,60,0.25), transparent),
        radial-gradient(ellipse 60% 40% at 80% 100%, rgba(168,85,247,0.15), transparent),
        radial-gradient(ellipse 50% 30% at 20% 100%, rgba(251,191,36,0.1), transparent),
        linear-gradient(180deg, #0c0614 0%, #0a0a0a 50%, #08060f 100%)
      `,
    }}>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                background: p.color,
                animation: `sparkFloat ${p.duration}s ${p.delay}s ease-out infinite`,
                boxShadow: `0 0 6px ${p.shadow}`,
              }}
            />
          ))}
        </div>
      )}
      <header className="flex items-center gap-3 px-4 pb-2 pt-12">
        <Link
          href="/welcome"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label={t("nav.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-sm font-medium text-white">
          {t("nav.streak")}
        </h1>
        <div className="flex items-center gap-2">
          {/* Kart Al butonu - sağ üstte küçük ikon */}
          <button
            onClick={() => setShowCard(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/20 to-amber-600/10 text-orange-300 ring-1 ring-orange-500/30 transition-all hover:from-orange-500/30 hover:to-amber-600/20 hover:text-orange-200 active:scale-90"
            aria-label={t("streak.get_card")}
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <GemBalance balance={gemState.balance} size="sm" animate />
          <FreezieBalance size="sm" animate refreshKey={freezieKey} />
        </div>
      </header>
      <main className="flex flex-1 flex-col overflow-y-auto pb-8">
        <StreakRoad currentStreak={currentStreak} />
      </main>

      {/* Story Kartı Modalı */}
      {showCard && (
        <StreakCard
          streak={currentStreak}
          kaiLevel={unlockedLevel}
          onClose={() => setShowCard(false)}
        />
      )}
    </div>
  );
}



