"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StreakRoad } from "@/components/StreakRoad";
import { GemBalance } from "@/components/GemBalance";
import { useGem } from "@/lib/gem-context";
import { useKai } from "@/lib/kai-context";
import { useEffect } from "react";

export default function StreakPage() {
  const { gemState } = useGem();
  const { unlockLevel } = useKai();

  // Streak 1'den başladığı için Kai level'ı da 1'e sıfırla
  useEffect(() => {
    localStorage.setItem("kai_level", "1");
    unlockLevel(1);
  }, [unlockLevel]);

  return (
    <div className="phone-shell welcome-gradient relative flex flex-col">
      <header className="flex items-center gap-3 px-4 pb-2 pt-12">
        <Link
          href="/welcome"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Geri"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-sm font-medium text-white">
          Streak
        </h1>
        <GemBalance balance={gemState.balance} size="sm" animate />
      </header>
      <main className="flex flex-1 flex-col overflow-y-auto pb-8">
        <StreakRoad currentStreak={1} />
      </main>
    </div>
  );
}
