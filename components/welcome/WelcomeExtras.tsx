"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { useKai } from "@/lib/kai-context";
import { getKaiLevelInfo } from "@/lib/kai-level";

export function WelcomeExtras() {
  const { avatar: kaiAvatar, unlockedLevel } = useKai();
  const kaiInfo = getKaiLevelInfo(unlockedLevel);

  return (
    <div className="space-y-3">
      {/* Günlük özet kartları */}
      <div className="grid grid-cols-3 gap-2">
        <div className="analytics-card analytics-card--purple px-2.5 py-2.5 text-center">
          <p className="text-[10px] text-zinc-500">Bugün</p>
          <p className="text-sm font-bold text-white">6.4k</p>
          <p className="text-[9px] text-purple-300">adım</p>
        </div>
        <div className="analytics-card analytics-card--orange px-2.5 py-2.5 text-center">
          <p className="text-[10px] text-zinc-500">Streak</p>
          <p className="text-sm font-bold text-white">12</p>
          <p className="text-[9px] text-orange-300">gün</p>
        </div>
        <div className="analytics-card analytics-card--green px-2.5 py-2.5 text-center">
          <p className="text-[10px] text-zinc-500">Hedef</p>
          <p className="text-sm font-bold text-white">78%</p>
          <p className="text-[9px] text-emerald-300">tamam</p>
        </div>
      </div>

      {/* Günün ipucu */}
      <div className="analytics-card analytics-card--purple flex items-start gap-3 p-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/25 text-purple-300">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-purple-300">Günün ipucu</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-300">
            Antrenmandan sonra 20g protein al; kas toparlanması hızlanır.
          </p>
        </div>
      </div>

      {/* Kai ile sohbet */}
      <Link
        href="/chat/kai"
        className="analytics-card analytics-card--blue flex items-center gap-3 p-3.5 transition active:scale-[0.99]"
      >
        <div className="relative h-11 w-11 shrink-0">
          <Image
            src={kaiAvatar}
            alt="Kai"
            width={44}
            height={44}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-zinc-500">
            Kai — Level {kaiInfo.level} ({kaiInfo.label})
          </p>
          <p className="text-sm font-semibold text-white">Kai ile sohbet</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
      </Link>
    </div>
  );
}
