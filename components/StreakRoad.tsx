"use client";

import { useEffect, useState, useRef } from "react";
import { Flame, Gem, Lock, Snowflake } from "lucide-react";
import Image from "next/image";
import { useKai } from "@/lib/kai-context";
import { useSound } from "@/lib/use-sound";
import { useSession } from "@/lib/session-context";
import { apiPost } from "@/lib/api/client";
import { getKaiLevel, KAI_LEVEL_THRESHOLDS, KAI_LEVEL_AVATARS, type KaiLevel } from "@/lib/kai-level";
import { useLang } from "@/lib/lang-context";

type StreakRoadProps = {
  currentStreak: number;
  onKaiLevelUp?: (newLevel: KaiLevel) => void;
};

type RoadSegment = {
  start: number;
  end: number;
  labelKey: string;
  milestone?: number;
  kaiLevel?: KaiLevel;
};

const SEGMENTS: RoadSegment[] = [
  { start: 0, end: 7, labelKey: "streak.segment.beginner", milestone: 7 },
  { start: 7, end: 31, labelKey: "streak.segment.novice", milestone: 31, kaiLevel: 2 },
  { start: 31, end: 61, labelKey: "streak.segment.veteran", milestone: 61, kaiLevel: 3 },
  { start: 61, end: 120, labelKey: "streak.segment.legend", milestone: 120, kaiLevel: 4 },
];

const MILESTONE_GEM_REWARD = 10;
const STATION_GEM_REWARD = 10;
const SPECIAL_STATION_DAY = 90;
const SPECIAL_STATION_GEM_REWARD = 30;

const GEM_ICON_STYLE = {
  color: "#a855f7",
  filter: "drop-shadow(0 0 6px rgba(168,85,247,0.5))",
};

function getSegmentIndex(streak: number): number {
  if (streak < 7) return 0;
  if (streak < 31) return 1;
  if (streak < 61) return 2;
  return 3;
}

function getProgressInSegment(streak: number, segment: RoadSegment): number {
  const clamped = Math.min(Math.max(streak, segment.start), segment.end);
  const range = segment.end - segment.start;
  if (range === 0) return 1;
  return (clamped - segment.start) / range;
}

export function StreakRoad({ currentStreak, onKaiLevelUp }: StreakRoadProps) {
  const { t } = useLang();
  const session = useSession();
  const { unlockLevel } = useKai();
  const { play } = useSound();
  const [claimedMilestones, setClaimedMilestones] = useState<Set<number>>(new Set());
  const [claimedStations, setClaimedStations] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [serverRewardsSynced, setServerRewardsSynced] = useState(false);
  const [justClaimed, setJustClaimed] = useState<{
    type: "milestone" | "station";
    value: number;
  } | null>(null);
  const [kaiLevelUp, setKaiLevelUp] = useState<KaiLevel | null>(null);
  const [pendingKaiLevel, setPendingKaiLevel] = useState<KaiLevel | null>(null);
  const [showEvolution, setShowEvolution] = useState(false);
  const [evolutionPhase, setEvolutionPhase] = useState<"idle" | "burning" | "evolving" | "done">("idle");
  const claimedRef = useRef(false);

  // Hydration sonrası localStorage'dan oku
  useEffect(() => {
    const savedMilestones = localStorage.getItem("streak_claimed_milestones");
    if (savedMilestones) {
      setClaimedMilestones(new Set(JSON.parse(savedMilestones)));
    }
    const savedStations = localStorage.getItem("streak_claimed_stations");
    if (savedStations) {
      setClaimedStations(new Set(JSON.parse(savedStations)));
    }
    setHydrated(true);
  }, []);

  const currentSegmentIdx = getSegmentIndex(currentStreak);

  // Kai level atlama kontrolü - hydration sonrası çalışır
  useEffect(() => {
    if (!hydrated) return;

    const level = getKaiLevel(currentStreak);
    const savedLevel = localStorage.getItem("kai_level");
    const prevLevel = savedLevel ? (Number(savedLevel) as KaiLevel) : 1;

    // Eğer level 1'den büyükse ve prevLevel geçerli değilse veya level > prevLevel ise pending'e ekle
    if (level > 1 && (!savedLevel || level > prevLevel)) {
      setPendingKaiLevel((prev) => {
        if (prev === null || level > prev) {
          return level;
        }
        return prev;
      });
    }
  }, [currentStreak, hydrated]);

  // Claim butonuna tıklandığında evrim animasyonunu başlat
  const handleClaimEvolution = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!pendingKaiLevel) return;
    
    setShowEvolution(true);
    setEvolutionPhase("burning");
    play("whoosh"); // Modern enerji patlaması — ilk ses
    
    // Önce yanma efekti
    setTimeout(() => {
      setEvolutionPhase("evolving");
      play("levelup"); // Dönüşüm sesi — ikinci ses
      
      // Sonra dönüşüm
      setTimeout(() => {
        setEvolutionPhase("done");
        play("transform"); // Başarı/zafer sesi — üçüncü ses
        
        // Animasyon bitince state'i güncelle
        setTimeout(() => {
          const level = pendingKaiLevel;
          unlockLevel(level);
          setKaiLevelUp(level);
          onKaiLevelUp?.(level);
          setPendingKaiLevel(null);
          setShowEvolution(false);
          setEvolutionPhase("idle");
          
          // Level up animasyonunu 3 saniye göster
          setTimeout(() => setKaiLevelUp(null), 3000);
        }, 1500);
      }, 2000);
    }, 2000);
  };

  // Server-authoritative streak gem rewards (replaces client-only earn).
  useEffect(() => {
    if (!hydrated || !session.isAuthenticated || serverRewardsSynced) return;
    if (currentStreak <= 0) {
      setServerRewardsSynced(true);
      return;
    }

    void apiPost<{ totalAwarded: number }>("/api/streak/rewards", {})
      .then((result) => {
        if (result.totalAwarded > 0) {
          setJustClaimed({ type: "milestone", value: currentStreak });
          setTimeout(() => setJustClaimed(null), 2000);
          void session.refreshSession();
        }
      })
      .catch(() => {
        // Non-fatal — UI still renders; user can retry on next visit.
      })
      .finally(() => setServerRewardsSynced(true));
  }, [hydrated, session.isAuthenticated, serverRewardsSynced, currentStreak, session]);

  // Milestone / station UI state from localStorage (display only).
  useEffect(() => {
    if (claimedRef.current) return;
    claimedRef.current = true;

    SEGMENTS.forEach((segment) => {
      if (
        segment.milestone &&
        currentStreak >= segment.milestone &&
        !claimedMilestones.has(segment.milestone)
      ) {
        const newClaimed = new Set(claimedMilestones);
        newClaimed.add(segment.milestone);
        setClaimedMilestones(newClaimed);
        localStorage.setItem(
          "streak_claimed_milestones",
          JSON.stringify([...newClaimed]),
        );
      }
    });

    for (let day = 1; day <= currentStreak; day++) {
      if (!claimedStations.has(day)) {
        const newClaimed = new Set(claimedStations);
        newClaimed.add(day);
        setClaimedStations(newClaimed);
        localStorage.setItem(
          "streak_claimed_stations",
          JSON.stringify([...newClaimed]),
        );
      }
    }
  }, [currentStreak, claimedMilestones, claimedStations]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {/* Başlık - glow efektli */}
      <div className="relative flex items-center justify-center gap-3">
        {/* Glow efekti */}
        <div className="absolute w-64 h-64 rounded-full blur-3xl opacity-20" style={{ background: `radial-gradient(circle, rgba(251,146,60,0.8), transparent 70%)`, animation: "pulse 3s ease-in-out infinite" }} />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-600/10 ring-1 ring-orange-500/30" style={{ boxShadow: "0 0 30px rgba(251,146,60,0.3), inset 0 0 20px rgba(251,146,60,0.1)" }}>
          <Flame className="h-7 w-7 text-orange-300" style={{ filter: "drop-shadow(0 0 10px rgba(251,146,60,0.6))", animation: "streakFlameDance 2s ease-in-out infinite" }} />
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-white" style={{ textShadow: "0 0 20px rgba(251,146,60,0.5), 0 0 40px rgba(251,146,60,0.3)" }}>{currentStreak}</p>
          <p className="text-xs text-zinc-500">{t("streak.daily")}</p>
        </div>
      </div>

      {/* Yol */}
      <div className="relative">
        {/* Dikey yol çizgisi */}
        <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500/40 via-amber-500/30 to-zinc-700/20" />

        <div className="flex flex-col gap-0">
          {SEGMENTS.map((segment, segIdx) => {
            const isActive = segIdx === currentSegmentIdx;
            const isCompleted = segIdx < currentSegmentIdx;
            const progress = isActive
              ? getProgressInSegment(currentStreak, segment)
              : isCompleted
                ? 1
                : 0;

            const range = segment.end - segment.start;
            const dots = range;
            const isMilestoneReached =
              segment.milestone && currentStreak >= segment.milestone;
            const isMilestoneClaimed =
              segment.milestone && claimedMilestones.has(segment.milestone);

            // Kai level durumu
            const kaiLevel = segment.kaiLevel;
            const isKaiUnlocked = kaiLevel ? currentStreak >= segment.milestone! : false;

            return (
              <div key={segIdx} className="relative">
                {/* Segment başlığı */}
                <div className="flex items-center gap-3 py-3">
                  <div
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
                      isCompleted
                        ? "bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30"
                        : isActive
                          ? "bg-gradient-to-br from-orange-500/80 to-amber-600/70 text-white ring-2 ring-orange-400/50 shadow-lg shadow-orange-500/20"
                          : "bg-zinc-800 text-zinc-600 ring-1 ring-zinc-700"
                    }`}
                  >
                    {isCompleted ? "✓" : segIdx + 1}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`text-sm font-semibold ${
                        isCompleted || isActive ? "text-orange-200" : "text-zinc-500"
                      }`}
                    >
                      {t(segment.labelKey)}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {segment.start} - {segment.end} {t("streak.day")}
                    </span>
                  </div>

                  {/* Kai level rozeti */}
                  {kaiLevel && (
                    <div className="ml-auto flex items-center gap-1">
                      {pendingKaiLevel === kaiLevel ? (
                        <button
                          onClick={handleClaimEvolution}
                          className="flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:from-orange-400 hover:to-amber-400 active:scale-95"
                        >
                          <Flame className="h-3 w-3" />
                          {t("streak.claim")} Lv.{kaiLevel}
                        </button>
                      ) : isKaiUnlocked ? (
                        <div className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-400">
                          <div className="relative h-4 w-4">
                            <Image
                              src={KAI_LEVEL_AVATARS[kaiLevel]}
              alt={t("streak.kai_level", { level: kaiLevel })}
                              width={16}
                              height={16}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          Lv.{kaiLevel}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                          <Lock className="h-3 w-3" />
                          Lv.{kaiLevel}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Milestone gem ödülü */}
                  {segment.milestone && isMilestoneReached && !kaiLevel && (
                    <div className="ml-auto flex items-center gap-1">
                      {isMilestoneClaimed ? (
                        <div className="flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] text-purple-400">
                          <Gem size={12} style={GEM_ICON_STYLE} />
                          +{MILESTONE_GEM_REWARD}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400 animate-pulse">
                          <Gem size={12} style={GEM_ICON_STYLE} />
                          +{MILESTONE_GEM_REWARD}
                        </div>
                      )}
                    </div>
                  )}

                  {isActive && !segment.milestone && (
                    <span className="ml-auto text-[10px] font-medium text-orange-400">
                      %{Math.round(progress * 100)}
                    </span>
                  )}
                </div>

                {/* Segment içi noktalar (duraklar/istasyonlar) */}
                <div className="relative ml-[18px] pl-9">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-zinc-800/50">
                    <div
                      className="w-full bg-gradient-to-b from-orange-500 to-amber-500 transition-all duration-700 ease-out"
                      style={{ height: `${progress * 100}%` }}
                    />
                  </div>

                  <div className="flex flex-col">
                    {Array.from({ length: dots }, (_, i) => {
                      const dotStreak = segment.start + i + 1;
                      const isReached = currentStreak >= dotStreak;
                      const isCurrent = currentStreak === dotStreak;
                      const isMilestoneDot =
                        segment.milestone === dotStreak;
                      const isSpecialStation =
                        dotStreak === SPECIAL_STATION_DAY;
                      const isStationClaimed =
                        claimedStations.has(dotStreak);

                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-2 py-[3px] transition-all duration-300 ${
                            isCurrent ? "scale-105" : ""
                          }`}
                        >
                          <div
                            className={`relative z-10 shrink-0 rounded-full transition-all duration-500 ${
                              isMilestoneDot
                                ? isReached
                                  ? "h-3 w-3 bg-amber-400 shadow-[0_0_8px_3px_rgba(251,191,36,0.5)] ring-1 ring-amber-300/50"
                                  : "h-3 w-3 bg-zinc-700 ring-1 ring-zinc-600"
                                : isSpecialStation
                                  ? isReached
                                    ? "h-4 w-4 bg-purple-400 shadow-[0_0_12px_4px_rgba(168,85,247,0.6)] ring-2 ring-purple-300/60"
                                    : "h-4 w-4 bg-zinc-700 ring-2 ring-zinc-600"
                                  : isReached
                                    ? "h-2 w-2 bg-orange-400 shadow-[0_0_6px_2px_rgba(251,146,60,0.4)]"
                                    : "h-2 w-2 bg-zinc-700"
                            } ${isCurrent && !isMilestoneDot && !isSpecialStation ? "h-3 w-3 ring-2 ring-orange-300/50" : ""}`}
                          />
                          <span
                            className={`flex items-center gap-1 text-[10px] transition-all duration-300 ${
                              isReached
                                ? "font-medium text-orange-200/80"
                                : "text-zinc-600"
                            } ${isCurrent ? "font-bold text-orange-200" : ""} ${isMilestoneDot ? "font-bold" : ""} ${isSpecialStation ? "font-bold text-purple-300" : ""}`}
                          >
                            {dotStreak % 7 === 0 ? (
                              <span className="inline-flex items-center gap-0.5">
                                {dotStreak}
                                <Snowflake className="h-2.5 w-2.5" style={{ color: "#38bdf8", filter: "drop-shadow(0 0 3px rgba(56,189,248,0.5))" }} />
                              </span>
                            ) : dotStreak}
                            {isReached && (
                              <span className="inline-flex items-center">
                                {isStationClaimed ? (
                                  <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[8px] ${isSpecialStation ? "bg-purple-500/20 text-purple-300" : "bg-purple-500/15 text-purple-400"}`}>
                                    <Gem size={isSpecialStation ? 10 : 8} style={GEM_ICON_STYLE} />
                                    {isSpecialStation ? SPECIAL_STATION_GEM_REWARD : STATION_GEM_REWARD}
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[8px] animate-pulse ${isSpecialStation ? "bg-purple-500/30 text-purple-300" : "bg-purple-500/20 text-purple-400"}`}>
                                    <Gem size={isSpecialStation ? 10 : 8} style={GEM_ICON_STYLE} />
                                    {isSpecialStation ? SPECIAL_STATION_GEM_REWARD : STATION_GEM_REWARD}
                                  </span>
                                )}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Kai Level görseli - segmentin sonunda (milestone noktasından sonra) */}
                {kaiLevel && (
                  <div className="ml-[18px] pl-9 pt-4 pb-2">
                    <div className={`flex items-center gap-4 rounded-xl border p-4 transition-all duration-500 ${
                      isKaiUnlocked && !pendingKaiLevel
                        ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-600/5"
                        : "border-zinc-700/50 bg-zinc-900/50"
                    }`}>
                      {/* Kai avatar */}
                      <div className={`relative h-16 w-16 shrink-0 transition-all duration-500 ${
                        isKaiUnlocked ? "opacity-100" : "opacity-40"
                      }`}>
                        <Image
                          src={KAI_LEVEL_AVATARS[kaiLevel]}
                          alt={t("streak.kai_level", { level: kaiLevel })}
                          width={64}
                          height={64}
                          className="h-full w-full object-contain"
                        />
                      </div>

                      {/* Level bilgisi */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {isKaiUnlocked && !pendingKaiLevel ? (
                            <span className="text-sm font-bold text-amber-300">
                              ✓ {t("streak.kai_level", { level: kaiLevel })}
                            </span>
                          ) : pendingKaiLevel === kaiLevel ? (
                            <span className="flex items-center gap-1.5 text-sm font-bold text-amber-400">
                              <Flame className="h-4 w-4 text-orange-400 animate-pulse" />
                              {t("streak.kai_level_ready", { level: kaiLevel })}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-sm font-bold text-zinc-500">
                              <Lock className="h-4 w-4" />
                              {t("streak.kai_level", { level: kaiLevel })}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs ${
                          isKaiUnlocked ? "text-amber-400/70" : "text-zinc-600"
                        }`}>
                          {t("streak.unlock_at", { day: segment.milestone! })}
                        </span>
                        {isKaiUnlocked && !pendingKaiLevel && (
                          <span className="mt-1 text-[10px] text-amber-400/50">
                            {t("streak.meet_new_look")}
                          </span>
                        )}
                        {pendingKaiLevel === kaiLevel && (
                          <button
                            onClick={handleClaimEvolution}
                            className="mt-2 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:from-orange-400 hover:to-amber-400 active:scale-95"
                          >
                            <Flame className="h-3.5 w-3.5" />
                            {t("streak.claim")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 120 hedefi - Kai Level 4 burada unlock olur, ayrıca gösterilmesine gerek yok çünkü Efsane segmentinde zaten var */}
      </div>

      {/* Evrim animasyonu - Dinamik (her level geçişi için) */}
      {showEvolution && pendingKaiLevel && (() => {
        const prevLevel = (pendingKaiLevel - 1) as KaiLevel;
        const isLevel2 = pendingKaiLevel === 2;
        const isLevel3 = pendingKaiLevel === 3;
        const isLevel4 = pendingKaiLevel === 4;
        
        // Level'e göre renk paleti
        const colors = isLevel2 
          ? { primary: '#ff6b00', secondary: '#ffd700', accent: '#ff4500', glow: 'rgba(251,191,36,0.8)', text: 'text-orange-300', textGlow: 'rgba(255,100,0,0.8)' }
          : isLevel3
          ? { primary: '#8b5cf6', secondary: '#a78bfa', accent: '#7c3aed', glow: 'rgba(139,92,246,0.8)', text: 'text-purple-300', textGlow: 'rgba(139,92,246,0.8)' }
          : { primary: '#a855f7', secondary: '#c084fc', accent: '#7c3aed', glow: 'rgba(168,85,247,0.9)', text: 'text-purple-300', textGlow: 'rgba(168,85,247,0.9)' };
        
        // Level 3 için ekstra efektler
        const extraEffects = isLevel3 || isLevel4;
        
        const bgGrad = isLevel2 
          ? 'from-orange-700/50 via-orange-500/40 to-transparent'
          : isLevel3
          ? 'from-purple-700/50 via-purple-500/40 to-transparent'
          : 'from-purple-700/50 via-purple-500/40 to-transparent';
        const bgGrad2 = isLevel2
          ? 'from-yellow-500/30 via-orange-400/20 to-transparent'
          : isLevel3
          ? 'from-violet-500/30 via-purple-400/20 to-transparent'
          : 'from-violet-500/30 via-purple-400/20 to-transparent';
        const flameGrad = isLevel2
          ? 'linear-gradient(to top, rgba(255,80,0,0.9), rgba(255,150,0,0.6), transparent)'
          : isLevel3
          ? 'linear-gradient(to top, rgba(139,92,246,0.9), rgba(167,139,250,0.6), transparent)'
          : 'linear-gradient(to top, rgba(168,85,247,0.9), rgba(196,113,245,0.6), transparent)';
        const flameGrad2 = isLevel2
          ? 'linear-gradient(to top, rgba(255,200,0,0.9), rgba(255,255,100,0.5), transparent)'
          : isLevel3
          ? 'linear-gradient(to top, rgba(196,181,253,0.9), rgba(255,255,255,0.5), transparent)'
          : 'linear-gradient(to top, rgba(233,213,255,0.9), rgba(255,255,255,0.5), transparent)';
        const sparkColors = isLevel2
          ? ['#ffd700', '#ff6b00', '#ff4500', '#ff0000', '#ffff00']
          : isLevel3
          ? ['#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#c4b5fd']
          : ['#c084fc', '#a78bfa', '#e9d5ff', '#7c3aed', '#d8b4fe'];
        const ringColor1 = isLevel2 ? 'rgba(251,191,36,0.4)' : isLevel3 ? 'rgba(139,92,246,0.4)' : 'rgba(168,85,247,0.5)';
        const ringColor2 = isLevel2 ? 'rgba(251,146,60,0.3)' : isLevel3 ? 'rgba(124,58,237,0.3)' : 'rgba(147,51,234,0.3)';
        const lightGrad = isLevel2
          ? 'from-amber-400/30 via-yellow-300/20 to-transparent'
          : isLevel3
          ? 'from-purple-400/30 via-violet-300/20 to-transparent'
          : 'from-purple-400/30 via-violet-300/20 to-transparent';
        const lightGrad2 = isLevel2
          ? 'from-white/20 via-amber-300/30 to-transparent'
          : isLevel3
          ? 'from-white/20 via-purple-300/30 to-transparent'
          : 'from-white/20 via-purple-300/30 to-transparent';
        const lightGrad3 = isLevel2
          ? 'from-white/30 via-yellow-200/40 to-transparent'
          : isLevel3
          ? 'from-white/30 via-violet-200/40 to-transparent'
          : 'from-white/30 via-violet-200/40 to-transparent';
        const beamColor = isLevel2 ? 'rgba(251,191,36,0.6)' : isLevel3 ? 'rgba(139,92,246,0.6)' : 'rgba(168,85,247,0.7)';
        const fireRingGrad = isLevel2
          ? 'from-orange-500/40 via-red-500/30 to-transparent'
          : isLevel3
          ? 'from-purple-500/40 via-violet-500/30 to-transparent'
          : 'from-purple-500/40 via-violet-500/30 to-transparent';
        const fireRingGrad2 = isLevel2
          ? 'from-yellow-400/30 via-orange-500/20 to-transparent'
          : isLevel3
          ? 'from-violet-400/30 via-purple-500/20 to-transparent'
          : 'from-violet-400/30 via-purple-500/20 to-transparent';
        const overlayGrad = isLevel2
          ? 'from-transparent via-orange-500/40 to-red-600/70'
          : isLevel3
          ? 'from-transparent via-purple-500/40 to-violet-600/70'
          : 'from-transparent via-purple-500/40 to-violet-600/70';
        const heatColor = isLevel2 ? 'rgba(255,100,0,0.15)' : isLevel3 ? 'rgba(139,92,246,0.15)' : 'rgba(168,85,247,0.15)';
        const meltGrad = isLevel2
          ? 'from-red-500/20 to-transparent'
          : isLevel3
          ? 'from-violet-500/20 to-transparent'
          : 'from-violet-500/20 to-transparent';
        const bornGlowGrad = isLevel2
          ? 'from-amber-400/30 via-yellow-300/20 to-transparent'
          : isLevel3
          ? 'from-purple-400/30 via-violet-300/20 to-transparent'
          : 'from-purple-400/30 via-violet-300/20 to-transparent';
        const bornGlowGrad2 = isLevel2
          ? 'from-white/20 via-amber-300/30 to-transparent'
          : isLevel3
          ? 'from-white/20 via-purple-300/30 to-transparent'
          : 'from-white/20 via-purple-300/30 to-transparent';
        const beamGrad = isLevel2
          ? 'from-transparent via-amber-400/40 to-transparent'
          : isLevel3
          ? 'from-transparent via-purple-400/40 to-transparent'
          : 'from-transparent via-purple-400/40 to-transparent';
        const beamGrad2 = isLevel2
          ? 'from-transparent via-yellow-300/30 to-transparent'
          : isLevel3
          ? 'from-transparent via-violet-300/30 to-transparent'
          : 'from-transparent via-violet-300/30 to-transparent';
        const explosionGrad = isLevel2
          ? 'from-amber-400/40 via-yellow-300/30 to-transparent'
          : isLevel3
          ? 'from-purple-400/40 via-violet-300/30 to-transparent'
          : 'from-purple-400/40 via-violet-300/30 to-transparent';
        const explosionGrad2 = isLevel2
          ? 'from-white/30 via-amber-300/40 to-transparent'
          : isLevel3
          ? 'from-white/30 via-purple-300/40 to-transparent'
          : 'from-white/30 via-purple-300/40 to-transparent';
        const explosionGrad3 = isLevel2
          ? 'from-yellow-200/40 via-white/30 to-transparent'
          : isLevel3
          ? 'from-violet-200/40 via-white/30 to-transparent'
          : 'from-violet-200/40 via-white/30 to-transparent';
        const haloGrad = isLevel2
          ? 'from-amber-400/20 via-yellow-300/10 to-transparent'
          : isLevel3
          ? 'from-purple-400/20 via-violet-300/10 to-transparent'
          : 'from-purple-400/20 via-violet-300/10 to-transparent';
        const dripColors = isLevel2
          ? { c1: 'from-orange-400 to-transparent', c2: 'from-red-400 to-transparent', c3: 'from-yellow-400 to-transparent' }
          : isLevel3
          ? { c1: 'from-purple-400 to-transparent', c2: 'from-violet-400 to-transparent', c3: 'from-fuchsia-400 to-transparent' }
          : { c1: 'from-purple-400 to-transparent', c2: 'from-violet-400 to-transparent', c3: 'from-fuchsia-400 to-transparent' };
        const energyColors = isLevel2
          ? ['#ffd700', '#ff6b00', '#ffffff', '#ff4500', '#ffff00']
          : isLevel3
          ? ['#a78bfa', '#8b5cf6', '#ffffff', '#7c3aed', '#c4b5fd']
          : ['#c084fc', '#a78bfa', '#e9d5ff', '#7c3aed', '#d8b4fe'];
        const transGrad = isLevel2
          ? 'from-orange-500 via-amber-400 to-yellow-300'
          : isLevel3
          ? 'from-purple-500 via-violet-400 to-fuchsia-300'
          : 'from-purple-500 via-violet-400 to-fuchsia-300';
        const transGrad2 = isLevel2
          ? 'from-red-400 via-amber-300 to-white'
          : isLevel3
          ? 'from-violet-400 via-purple-300 to-white'
          : 'from-violet-400 via-purple-300 to-white';
        const transGrad3 = isLevel2
          ? 'from-yellow-300 via-white to-yellow-300'
          : isLevel3
          ? 'from-fuchsia-300 via-white to-fuchsia-300'
          : 'from-fuchsia-300 via-white to-fuchsia-300';
        const filterStyle = isLevel2
          ? 'brightness(2.2) saturate(1.8) sepia(0.6) hue-rotate(-15deg) contrast(1.3)'
          : isLevel3
          ? 'brightness(2.2) saturate(1.8) sepia(0.6) hue-rotate(240deg) contrast(1.3)'
          : 'brightness(2.2) saturate(1.8) sepia(0.6) hue-rotate(270deg) contrast(1.3)';
        const oldFilter = isLevel2
          ? 'grayscale(1) brightness(0.3) sepia(0.5)'
          : isLevel3
          ? 'grayscale(1) brightness(0.3) sepia(0.5) hue-rotate(240deg)'
          : 'grayscale(1) brightness(0.3) sepia(0.5) hue-rotate(270deg)';
        const newFilter = isLevel2
          ? 'brightness(1.8) saturate(1.4) drop-shadow(0 0 40px rgba(251,191,36,0.8))'
          : isLevel3
          ? 'brightness(1.8) saturate(1.4) drop-shadow(0 0 40px rgba(139,92,246,0.8))'
          : 'brightness(1.8) saturate(1.4) drop-shadow(0 0 40px rgba(168,85,247,0.8))';
        const finalFilter = isLevel2
          ? 'drop-shadow(0 0 40px rgba(251,191,36,0.7)) drop-shadow(0 0 80px rgba(251,146,60,0.3))'
          : isLevel3
          ? 'drop-shadow(0 0 40px rgba(139,92,246,0.7)) drop-shadow(0 0 80px rgba(124,58,237,0.3))'
          : 'drop-shadow(0 0 50px rgba(168,85,247,0.8)) drop-shadow(0 0 100px rgba(147,51,234,0.4))';
        const textShadowStyle = isLevel2
          ? '0 0 10px rgba(255,100,0,0.8), 0 0 30px rgba(255,50,0,0.4), 0 0 60px rgba(255,0,0,0.2)'
          : isLevel3
          ? '0 0 10px rgba(139,92,246,0.8), 0 0 30px rgba(124,58,237,0.4), 0 0 60px rgba(88,28,135,0.2)'
          : '0 0 10px rgba(168,85,247,0.8), 0 0 30px rgba(147,51,234,0.4), 0 0 60px rgba(126,34,206,0.2)';
        const textShadowStyle2 = isLevel2
          ? '0 0 15px rgba(251,191,36,0.8), 0 0 40px rgba(251,146,60,0.4), 0 0 80px rgba(251,191,36,0.2)'
          : isLevel3
          ? '0 0 15px rgba(139,92,246,0.8), 0 0 40px rgba(124,58,237,0.4), 0 0 80px rgba(139,92,246,0.2)'
          : '0 0 15px rgba(168,85,247,0.8), 0 0 40px rgba(147,51,234,0.4), 0 0 80px rgba(168,85,247,0.2)';
        const textShadowStyle3 = isLevel2
          ? '0 0 20px rgba(251,191,36,0.5), 0 0 40px rgba(251,146,60,0.3)'
          : isLevel3
          ? '0 0 20px rgba(139,92,246,0.5), 0 0 40px rgba(124,58,237,0.3)'
          : '0 0 20px rgba(168,85,247,0.5), 0 0 40px rgba(147,51,234,0.3)';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" style={{ 
            animation: evolutionPhase === "burning" 
              ? 'screenShake 0.03s ease-in-out infinite, screenShake2 0.05s ease-in-out infinite 0.015s' 
              : evolutionPhase === "evolving" 
              ? 'screenShake 0.04s ease-in-out infinite, screenShake3 0.06s ease-in-out infinite 0.02s'
              : evolutionPhase === "done" && isLevel4
              ? 'screenShake 0.05s ease-in-out infinite, screenShake4 0.07s ease-in-out infinite 0.025s, screenShake2 0.09s ease-in-out infinite 0.04s'
              : evolutionPhase === "done"
              ? 'screenShake 0.06s ease-in-out infinite, screenShake3 0.08s ease-in-out infinite 0.03s'
              : 'none' 
          }}>
            
            {/* ===== YANMA FAZI ===== */}
            {evolutionPhase === "burning" && (
              <div className="relative flex flex-col items-center gap-4">
                {/* Alev tabanı - büyük ateş topu */}
                <div className={`absolute bottom-[25%] left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-t ${bgGrad} blur-3xl`} style={{ animation: 'fireBase 0.5s ease-in-out infinite' }} />
                <div className={`absolute bottom-[25%] left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-gradient-to-t ${bgGrad2} blur-2xl`} style={{ animation: 'fireBase 0.7s ease-in-out infinite 0.15s' }} />
                
                {/* Duman bulutları */}
                {[...Array(6)].map((_, i) => {
                  const angle = (i / 6) * Math.PI * 2;
                  const dist = 80 + Math.random() * 60;
                  const x = Math.cos(angle) * dist;
                  const y = Math.sin(angle) * dist - 40;
                  return (
                    <div
                      key={`smoke-${i}`}
                      className="absolute rounded-full"
                      style={{
                        width: `${40 + Math.random() * 60}px`,
                        height: `${40 + Math.random() * 60}px`,
                        background: `radial-gradient(circle, rgba(100,80,60,0.3), transparent)`,
                        left: '50%',
                        top: '30%',
                        transform: `translate(calc(-50% + ${x}px), ${y}px)`,
                        animation: `smokeRise ${2 + Math.random() * 2}s ${Math.random() * 2}s ease-out infinite`,
                        filter: `blur(${8 + Math.random() * 12}px)`,
                      }}
                    />
                  );
                })}

                {/* Yükselen alevler - 3 katman */}
                {[...Array(8)].map((_, i) => {
                  const angle = (i / 8) * Math.PI * 2;
                  const x = Math.cos(angle) * 50;
                  const delay = i * 0.12;
                  return (
                    <div key={`flame-outer-${i}`}>
                      <div
                        className="absolute bottom-[30%] left-1/2 h-24 w-4 -translate-x-1/2 rounded-full"
                        style={{
                          background: flameGrad,
                          transform: `translate(calc(-50% + ${x}px), 0) rotate(${(Math.random() - 0.5) * 40}deg)`,
                          animation: `flameRise ${0.6 + Math.random() * 0.4}s ${delay}s ease-out infinite`,
                          filter: `blur(${3 + Math.random() * 3}px)`,
                        }}
                      />
                      <div
                        className="absolute bottom-[30%] left-1/2 h-16 w-2 -translate-x-1/2 rounded-full"
                        style={{
                          background: flameGrad2,
                          transform: `translate(calc(-50% + ${x * 0.6}px), 0) rotate(${(Math.random() - 0.5) * 20}deg)`,
                          animation: `flameRise ${0.4 + Math.random() * 0.3}s ${delay + 0.06}s ease-out infinite`,
                          filter: `blur(2px)`,
                        }}
                      />
                    </div>
                  );
                })}

                {/* Level 3 için ekstra mor kristal kıvılcımları */}
                {extraEffects && [...Array(20)].map((_, i) => {
                  const angle = Math.random() * Math.PI * 2;
                  const dist = 50 + Math.random() * 150;
                  const x = Math.cos(angle) * dist;
                  const y = Math.sin(angle) * dist - 50;
                  const size = 2 + Math.random() * 5;
                  return (
                    <div
                      key={`crystal-${i}`}
                      className="absolute"
                      style={{
                        left: '50%',
                        top: '35%',
                        transform: `translate(${x}px, ${y}px)`,
                        animation: `sparkBurst ${1.5 + Math.random() * 2}s ${Math.random() * 3}s ease-out infinite`,
                      }}
                    >
                      <div
                        className="rounded-sm"
                        style={{
                          width: `${size}px`,
                          height: `${size * 1.5}px`,
                          background: `linear-gradient(to bottom, rgba(196,181,253,0.9), rgba(139,92,246,0.4))`,
                          boxShadow: `0 0 ${size * 3}px rgba(139,92,246,0.6)`,
                          transform: `rotate(${Math.random() * 360}deg)`,
                          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                        }}
                      />
                    </div>
                  );
                })}

                {/* Kıvılcım yağmuru - 30 adet */}
                {[...Array(30)].map((_, i) => {
                  const angle = Math.random() * Math.PI * 2;
                  const dist = 30 + Math.random() * 120;
                  const x = Math.cos(angle) * dist;
                  const y = Math.sin(angle) * dist - 30;
                  const size = 1 + Math.random() * 3;
                  return (
                    <div
                      key={`spark-${i}`}
                      className="absolute rounded-full"
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        background: sparkColors[i % sparkColors.length],
                        left: '50%',
                        top: '35%',
                        transform: `translate(${x}px, ${y}px)`,
                        animation: `sparkBurst ${0.8 + Math.random() * 1.2}s ${Math.random() * 2}s ease-out infinite`,
                        boxShadow: `0 0 ${2 + size * 2}px ${sparkColors[i % sparkColors.length]}`,
                      }}
                    />
                  );
                })}

                {/* Eski Kai Level - yoğun yanma */}
                <div className="relative z-10 mt-24">
                  <div className="relative" style={{ animation: 'burnShake 0.08s ease-in-out infinite' }}>
                    {/* Alev çerçevesi */}
                    <div className={`absolute -inset-8 rounded-full bg-gradient-to-b ${fireRingGrad} blur-2xl`} style={{ animation: 'fireRing 0.3s ease-in-out infinite' }} />
                    <div className={`absolute -inset-4 rounded-full bg-gradient-to-b ${fireRingGrad2} blur-xl`} style={{ animation: 'fireRing 0.4s ease-in-out infinite 0.1s' }} />
                    
                    <Image
                      src={KAI_LEVEL_AVATARS[prevLevel]}
                      alt={t("streak.kai_level", { level: prevLevel })}
                      width={128}
                      height={128}
                      className="h-32 w-32 object-contain"
                      style={{
                        filter: filterStyle,
                        animation: 'burnPulse 0.15s ease-in-out infinite',
                      }}
                    />
                    {/* Alev overlay */}
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-b ${overlayGrad} mix-blend-overlay`} style={{ animation: 'burnOverlay 0.2s ease-in-out infinite' }} />
                    {/* Sıcaklık dalgası */}
                    <div className="absolute -inset-6 rounded-full" style={{ animation: 'heatWave 0.5s ease-in-out infinite', background: `radial-gradient(circle, ${heatColor}, transparent 70%)` }} />
                  </div>
                </div>
                
                {/* Alev yazısı */}
                <p className={`relative z-10 text-lg font-black tracking-[0.3em] ${colors.text}`} style={{ 
                  animation: 'flicker 0.08s ease-in-out infinite',
                  textShadow: textShadowStyle
                }}>
                  {t("streak.evolving")}
                </p>
                
                {/* Alev çubuğu */}
                <div className="relative z-10 flex gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full"
                      style={{
                        height: `${12 + Math.random() * 20}px`,
                        background: i % 2 === 0 ? colors.primary : colors.secondary,
                        animation: `flameBar ${0.4 + Math.random() * 0.3}s ${i * 0.08}s ease-in-out infinite`,
                        boxShadow: `0 0 6px ${i % 2 === 0 ? colors.primary : colors.secondary}`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ===== DÖNÜŞÜM FAZI ===== */}
            {evolutionPhase === "evolving" && (
              <div className="relative flex flex-col items-center gap-4" style={{ animation: 'screenShake 0.1s ease-in-out infinite' }}>
                {/* Işık halkaları - çok katmanlı */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={`ring-${i}`}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: `${80 + i * 50}px`,
                      height: `${80 + i * 50}px`,
                      border: `2px solid ${i % 2 === 0 ? ringColor1 : ringColor2}`,
                      animation: `lightRing ${1.2 + i * 0.2}s ease-out infinite`,
                      animationDelay: `${i * 0.15}s`,
                      boxShadow: `inset 0 0 ${10 + i * 5}px ${i % 2 === 0 ? ringColor1.replace('0.4', '0.1') : ringColor2.replace('0.3', '0.05')}`,
                    }}
                  />
                ))}

                {/* Işık patlaması - merkez */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className={`h-96 w-96 rounded-full bg-gradient-to-br ${lightGrad} blur-3xl`} style={{ animation: 'lightPulse 0.5s ease-in-out infinite' }} />
                  <div className={`absolute inset-8 rounded-full bg-gradient-to-br ${lightGrad2} blur-2xl`} style={{ animation: 'lightPulse 0.7s ease-in-out infinite 0.15s' }} />
                  <div className={`absolute inset-16 rounded-full bg-gradient-to-br ${lightGrad3} blur-xl`} style={{ animation: 'lightPulse 0.4s ease-in-out infinite 0.3s' }} />
                </div>

                {/* Level 3 için büyülü semboller */}
                {extraEffects && [...Array(8)].map((_, i) => {
                  const angle = (i / 8) * Math.PI * 2;
                  const dist = 100 + Math.random() * 80;
                  const x = Math.cos(angle) * dist;
                  const y = Math.sin(angle) * dist;
                  const symbols = ['✦', '✧', '◇', '○', '☆', '❋', '✶', '✴'];
                  return (
                    <div
                      key={`symbol-${i}`}
                      className="absolute text-2xl"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                        color: ['#a78bfa', '#c4b5fd', '#8b5cf6', '#7c3aed'][i % 4],
                        animation: `sparkle ${1 + Math.random()}s ${Math.random() * 2}s ease-in-out infinite`,
                        opacity: 0.6,
                        textShadow: `0 0 20px ${['#a78bfa', '#c4b5fd', '#8b5cf6', '#7c3aed'][i % 4]}`,
                      }}
                    >
                      {symbols[i % symbols.length]}
                    </div>
                  );
                })}

                {/* Level 3 için kristal oluşumu */}
                {extraEffects && [...Array(12)].map((_, i) => {
                  const angle = (i / 12) * Math.PI * 2;
                  const dist = 40 + Math.random() * 60;
                  const x = Math.cos(angle) * dist;
                  const y = Math.sin(angle) * dist;
                  const size = 3 + Math.random() * 8;
                  return (
                    <div
                      key={`crystal-form-${i}`}
                      className="absolute"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                        animation: `born ${1.5 + Math.random()}s ease-out forwards ${Math.random() * 1.5}s`,
                        opacity: 0,
                      }}
                    >
                      <div
                        style={{
                          width: `${size}px`,
                          height: `${size * 2}px`,
                          background: `linear-gradient(to bottom, rgba(196,181,253,0.8), rgba(139,92,246,0.3))`,
                          borderRadius: '2px',
                          transform: `rotate(${Math.random() * 360}deg)`,
                          boxShadow: `0 0 ${size * 2}px rgba(139,92,246,0.4)`,
                          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                        }}
                      />
                    </div>
                  );
                })}

                {/* Yükselen enerji parçacıkları */}
                {[...Array(15)].map((_, i) => (
                  <div
                    key={`particle-${i}`}
                    className="absolute rounded-full"
                    style={{
                      width: `${2 + Math.random() * 4}px`,
                      height: `${2 + Math.random() * 4}px`,
                      background: energyColors[i % energyColors.length],
                      left: `${20 + Math.random() * 60}%`,
                      top: `${40 + Math.random() * 30}%`,
                      animation: `energyRise ${1 + Math.random() * 1.5}s ${Math.random() * 2}s ease-out infinite`,
                      boxShadow: `0 0 ${4 + Math.random() * 6}px ${energyColors[i % energyColors.length]}`,
                    }}
                  />
                ))}

                {/* Dönüşüm - eski Level'den yeni Level'e */}
                <div className="relative z-10 flex items-center gap-10">
                  {/* Eski form - eriyip yok oluyor */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <div className={`absolute -inset-4 rounded-full bg-gradient-to-b ${meltGrad} blur-xl`} style={{ animation: 'meltGlow 1s ease-in-out infinite' }} />
                      <Image
                        src={KAI_LEVEL_AVATARS[prevLevel]}
                      alt={t("streak.kai_level", { level: prevLevel })}
                        width={96}
                        height={96}
                        className="h-24 w-24 object-contain"
                        style={{ 
                          filter: oldFilter,
                          animation: 'meltAway 2s ease-in-out forwards',
                          opacity: 0.6,
                        }}
                      />
                      {/* Eriyen damlalar */}
                      <div className={`absolute -bottom-6 left-1/2 h-10 w-1 -translate-x-1/2 rounded-full bg-gradient-to-b ${dripColors.c1}`} style={{ animation: 'drip 0.8s ease-in-out infinite' }} />
                      <div className={`absolute -bottom-4 left-1/3 h-6 w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b ${dripColors.c2}`} style={{ animation: 'drip 1.1s ease-in-out infinite 0.3s' }} />
                      <div className={`absolute -bottom-5 right-1/3 h-8 w-0.5 translate-x-1/2 rounded-full bg-gradient-to-b ${dripColors.c3}`} style={{ animation: 'drip 0.9s ease-in-out infinite 0.6s' }} />
                    </div>
                    <span className="text-xs text-zinc-600">{t("streak.level", { level: prevLevel })}</span>
                  </div>

                  {/* Dönüşüm enerjisi */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-3xl" style={{ color: colors.secondary, animation: 'sparkle 0.3s ease-in-out infinite' }}>✦</div>
                    <div className="relative h-12 w-20">
                      <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${transGrad} blur-sm`} style={{ animation: 'pulse 0.4s ease-in-out infinite' }} />
                      <div className={`absolute inset-1 rounded-full bg-gradient-to-r ${transGrad2} blur-md`} style={{ animation: 'pulse 0.6s ease-in-out infinite 0.1s' }} />
                      <div className={`absolute inset-2 rounded-full bg-gradient-to-r ${transGrad3} blur-lg`} style={{ animation: 'pulse 0.3s ease-in-out infinite 0.2s' }} />
                    </div>
                    <div className="text-3xl" style={{ color: colors.secondary, animation: 'sparkle 0.3s ease-in-out infinite 0.15s' }}>✦</div>
                  </div>

                  {/* Yeni form - doğuyor */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      {/* Işık halesi */}
                      <div className={`absolute -inset-8 rounded-full bg-gradient-to-br ${bornGlowGrad} blur-3xl`} style={{ animation: 'bornGlow 0.5s ease-in-out infinite' }} />
                      <div className={`absolute -inset-4 rounded-full bg-gradient-to-br ${bornGlowGrad2} blur-2xl`} style={{ animation: 'bornGlow 0.7s ease-in-out infinite 0.15s' }} />
                      
                      <Image
                        src={KAI_LEVEL_AVATARS[pendingKaiLevel]}
                        alt={t("streak.kai_level", { level: pendingKaiLevel })}
                        width={96}
                        height={96}
                        className="h-24 w-24 object-contain"
                        style={{
                          filter: newFilter,
                          animation: 'born 2s ease-out forwards, glowPulse 0.5s ease-in-out infinite',
                        }}
                      />
                      {/* Işık ışınları */}
                      <div className={`absolute left-1/2 top-1/2 h-32 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b ${beamGrad}`} style={{ animation: 'lightBeam 0.8s ease-in-out infinite' }} />
                      <div className={`absolute left-1/2 top-1/2 h-0.5 w-32 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r ${beamGrad}`} style={{ animation: 'lightBeam 0.8s ease-in-out infinite 0.2s' }} />
                      <div className={`absolute left-1/2 top-1/2 h-28 w-0.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gradient-to-b ${beamGrad2}`} style={{ animation: 'lightBeam 0.8s ease-in-out infinite 0.4s' }} />
                      <div className={`absolute left-1/2 top-1/2 h-28 w-0.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-gradient-to-b ${beamGrad2}`} style={{ animation: 'lightBeam 0.8s ease-in-out infinite 0.6s' }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: colors.secondary, animation: 'fadeIn 1s ease-out forwards' }}>{t("streak.level", { level: pendingKaiLevel })}</span>
                  </div>
                </div>

                <p className={`relative z-10 text-lg font-black tracking-[0.3em] ${colors.text}`} style={{ 
                  animation: 'glowPulse 0.4s ease-in-out infinite',
                  textShadow: textShadowStyle2
                }}>
                  {t("streak.transforming")}
                </p>
              </div>
            )}

            {/* ===== TAMAMLANDI FAZI ===== */}
            {evolutionPhase === "done" && (
              <div className="relative flex flex-col items-center gap-4">
                {/* Patlama halkaları */}
                {[...Array(12)].map((_, i) => (
                  <div
                    key={`explosion-${i}`}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: `${40 + i * 40}px`,
                      height: `${40 + i * 40}px`,
                      border: `${1 + (i % 2)}px solid ${i % 2 === 0 ? ringColor1 : ringColor2}`,
                      animation: `explosionRing ${0.8 + i * 0.1}s ease-out forwards`,
                      animationDelay: `${i * 0.08}s`,
                      opacity: 0,
                      boxShadow: `0 0 ${10 + i * 5}px ${i % 2 === 0 ? ringColor1.replace('0.4', '0.15') : ringColor2.replace('0.3', '0.08')}`,
                    }}
                  />
                ))}

                {/* Işık patlaması */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className={`h-[500px] w-[500px] rounded-full bg-gradient-to-br ${explosionGrad} blur-3xl`} style={{ animation: 'explosion 1.2s ease-out forwards' }} />
                  <div className={`absolute inset-12 rounded-full bg-gradient-to-br ${explosionGrad2} blur-2xl`} style={{ animation: 'explosion 1.2s ease-out forwards 0.2s' }} />
                  <div className={`absolute inset-24 rounded-full bg-gradient-to-br ${explosionGrad3} blur-xl`} style={{ animation: 'explosion 1.2s ease-out forwards 0.4s' }} />
                </div>

                {/* Yükselen ışık sütunları */}
                {[...Array(8)].map((_, i) => {
                  const angle = (i / 8) * Math.PI * 2;
                  const x = Math.cos(angle) * 60;
                  return (
                    <div
                      key={`beam-${i}`}
                      className="absolute bottom-0 h-64 w-1 rounded-full"
                      style={{
                        background: `linear-gradient(to top, ${beamColor}, transparent)`,
                        left: '50%',
                        transform: `translateX(calc(-50% + ${x}px))`,
                        animation: `lightBeamRise 1s ease-out forwards ${i * 0.1}s`,
                        opacity: 0,
                      }}
                    />
                  );
                })}


                {/* Yeni Kai Level - görkemli çıkış */}
                <div className="relative z-10 flex flex-col items-center gap-3" style={{ animation: 'riseUp 0.8s ease-out forwards' }}>
                  <div className="relative">
                    <Image
                      src={KAI_LEVEL_AVATARS[pendingKaiLevel]}
                      alt={t("streak.kai_level", { level: pendingKaiLevel })}
                      width={180}
                      height={180}
                      className="h-44 w-44 object-contain"
                      style={{
                        filter: isLevel4 ? 'drop-shadow(0 0 50px rgba(168,85,247,0.8)) drop-shadow(0 0 100px rgba(147,51,234,0.4))' : finalFilter,
                        animation: isLevel4 ? 'level4Glow 2s ease-in-out infinite' : 'float 3s ease-in-out infinite',
                      }}
                    />
                    {/* Işık halesi */}
                    <div className={`absolute -inset-8 rounded-full bg-gradient-to-br ${haloGrad} blur-3xl animate-pulse`} />
                    
                    {/* Level 4 için ekstra neon mor hale */}
                    {isLevel4 && (
                      <>
                        <div className="absolute -inset-16 rounded-full" style={{
                          background: 'radial-gradient(circle, rgba(168,85,247,0.25), transparent 70%)',
                          animation: 'pulse 2s ease-in-out infinite',
                        }} />
                        <div className="absolute -inset-24 rounded-full" style={{
                          background: 'radial-gradient(circle, rgba(196,113,245,0.15), transparent 70%)',
                          animation: 'pulse 2s ease-in-out infinite 0.5s',
                        }} />
                      </>
                    )}
                  </div>
                  <p className="text-3xl font-bold" style={{ color: colors.secondary, textShadow: textShadowStyle3 }}>
                    {t("streak.kai_level_up", { level: pendingKaiLevel })}
                  </p>
                  <p className="text-sm font-medium tracking-wider" style={{ color: colors.secondary.replace(')', '/80)') }}>
                    {(() => {
                      const info = KAI_LEVEL_THRESHOLDS.find((row) => row.level === pendingKaiLevel);
                      return info ? t(info.labelKey) : "";
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Just claimed animasyonu */}
      {justClaimed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className={`animate-bounce rounded-2xl px-6 py-4 text-center backdrop-blur-sm ring-1 ${
            justClaimed.type === "station" && justClaimed.value === SPECIAL_STATION_DAY
              ? "bg-gradient-to-br from-purple-500/40 to-violet-600/30 ring-purple-400/50"
              : "bg-gradient-to-br from-purple-500/30 to-violet-600/20 ring-purple-400/30"
          }`}>
            <Gem className="mx-auto h-8 w-8" style={GEM_ICON_STYLE} />
            <p className="mt-1 text-lg font-bold text-purple-200">
              +{justClaimed.type === "milestone" ? MILESTONE_GEM_REWARD : justClaimed.value === SPECIAL_STATION_DAY ? SPECIAL_STATION_GEM_REWARD : STATION_GEM_REWARD} 💎
            </p>
            <p className="text-xs text-purple-300/70">
              {justClaimed.type === "milestone"
                ? t("streak.day_streak", { day: justClaimed.value })
                : justClaimed.value === SPECIAL_STATION_DAY
                  ? t("streak.mega_reward", { day: justClaimed.value })
                  : t("streak.day_reward", { day: justClaimed.value })}
            </p>
          </div>
        </div>
      )}

      {/* Kai level up animasyonu */}
      {kaiLevelUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-bounce rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-600/20 px-8 py-6 text-center backdrop-blur-sm ring-1 ring-amber-400/30">
            <Flame className="mx-auto h-10 w-10 text-orange-400" />
            <p className="mt-2 text-xl font-bold text-orange-200">
              {t("streak.kai_level_up", { level: kaiLevelUp })}
            </p>
            <p className="text-sm text-orange-300/70">
              {(() => {
                const info = KAI_LEVEL_THRESHOLDS.find((row) => row.level === kaiLevelUp);
                return info ? t(info.labelKey) : "";
              })()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
