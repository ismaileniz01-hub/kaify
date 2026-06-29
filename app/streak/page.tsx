"use client";

import Link from "next/link";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { StreakRoad } from "@/components/StreakRoad";
import { StreakCard } from "@/components/StreakCard";
import { GemBalance } from "@/components/GemBalance";
import { useGem } from "@/lib/gem-context";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { useEffect, useState } from "react";

export default function StreakPage() {
  const { gemState } = useGem();
  const { unlockedLevel, unlockLevel } = useKai();
  const { t } = useLang();
  const [showCard, setShowCard] = useState(false);

  // Test için streak 31'den başlasın (Kai Level 2'yi açmak için)
  useEffect(() => {
    localStorage.setItem("kai_level", "1");
    unlockLevel(1);
  }, [unlockLevel]);

  const currentStreak = 31;

  return (
    <div className="phone-shell welcome-gradient relative flex flex-col">
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



