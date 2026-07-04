"use client";

import Link from "next/link";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { StreakRoad } from "@/components/StreakRoad";
import { StreakAtRiskBanner } from "@/components/streak/StreakAtRiskBanner";
import { StreakCard } from "@/components/StreakCard";
import { GemBalance } from "@/components/GemBalance";
import { FreezieBalance } from "@/components/FreezieBalance";
import { useGem } from "@/lib/gem-context";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { useEffect, useState } from "react";

export default function StreakPage() {
  const { gemState } = useGem();
  const { unlockedLevel, unlockLevel } = useKai();
  const { t } = useLang();
  const { streak, isAuthenticated, checkIn } = useSession();
  const [showCard, setShowCard] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (streak.kaiUnlockedLevel > unlockedLevel) {
      unlockLevel(streak.kaiUnlockedLevel as 1 | 2 | 3 | 4);
    }
  }, [streak.kaiUnlockedLevel, unlockedLevel, unlockLevel]);

  const handleCheckIn = async () => {
    if (!isAuthenticated || checkingIn) return;
    setCheckingIn(true);
    setCheckInMsg(null);
    try {
      const result = await checkIn();
      setCheckInMsg({
        kind: "ok",
        text: t("streak.checkin_success", { streak: result.currentStreak }),
      });
    } catch (error) {
      console.error("[streak] check-in failed:", error);
      const already =
        error instanceof Error && /already|zaten|bugün|today/i.test(error.message);
      setCheckInMsg({
        kind: already ? "ok" : "err",
        text: already
          ? t("streak.checkin_already")
          : t("streak.checkin_error"),
      });
    } finally {
      setCheckingIn(false);
      setTimeout(() => setCheckInMsg(null), 4000);
    }
  };

  const [particles, setParticles] = useState<
    { left: number; top: number; color: string; shadow: string; duration: number; delay: number }[]
  >([]);

  useEffect(() => {
    setParticles(
      [...Array(20)].map((_, i) => ({
        left: 5 + Math.random() * 90,
        top: 5 + Math.random() * 90,
        color:
          i % 3 === 0
            ? "rgba(251,146,60,0.4)"
            : i % 3 === 1
              ? "rgba(168,85,247,0.3)"
              : "rgba(251,191,36,0.3)",
        shadow:
          i % 3 === 0
            ? "rgba(251,146,60,0.3)"
            : i % 3 === 1
              ? "rgba(168,85,247,0.3)"
              : "rgba(251,191,36,0.3)",
        duration: 3 + Math.random() * 4,
        delay: Math.random() * 5,
      })),
    );
  }, []);

  const currentStreak = streak.currentStreak;

  return (
    <div
      className="phone-shell relative flex flex-col"
      style={{
        background: `
        radial-gradient(ellipse 100% 60% at 50% -10%, rgba(251,146,60,0.25), transparent),
        radial-gradient(ellipse 60% 40% at 80% 100%, rgba(168,85,247,0.15), transparent),
        radial-gradient(ellipse 50% 30% at 20% 100%, rgba(251,191,36,0.1), transparent),
        linear-gradient(180deg, #0c0614 0%, #0a0a0a 50%, #08060f 100%)
      `,
      }}
    >
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 rounded-full"
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
          <button
            onClick={() => setShowCard(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/20 to-amber-600/10 text-orange-300 ring-1 ring-orange-500/30 transition-all hover:from-orange-500/30 hover:to-amber-600/20 hover:text-orange-200 active:scale-90"
            aria-label={t("streak.get_card")}
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <GemBalance balance={gemState.balance} size="sm" animate />
          <FreezieBalance
            size="sm"
            animate
            balance={isAuthenticated ? streak.freezieBalance : undefined}
          />
        </div>
      </header>

      {isAuthenticated && (
        <div className="space-y-2 px-4 pb-2">
          <StreakAtRiskBanner
            currentStreak={streak.currentStreak}
            lastCheckInDate={streak.lastCheckInDate}
            freezieBalance={streak.freezieBalance}
          />
          <button
            type="button"
            onClick={() => void handleCheckIn()}
            disabled={checkingIn}
            className="w-full rounded-xl bg-orange-500/20 py-2.5 text-sm font-semibold text-orange-200 ring-1 ring-orange-400/30 transition hover:bg-orange-500/30 disabled:opacity-50"
          >
            {checkingIn ? "…" : t("streak.checkin_button")}
          </button>
          {checkInMsg && (
            <p
              className={`mt-2 text-center text-xs font-medium ${
                checkInMsg.kind === "ok" ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {checkInMsg.text}
            </p>
          )}
        </div>
      )}

      <main className="flex flex-1 flex-col overflow-y-auto pb-8">
        <StreakRoad currentStreak={currentStreak} />
      </main>

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
