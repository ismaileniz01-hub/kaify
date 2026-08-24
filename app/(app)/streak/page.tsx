"use client";

import { Image as ImageIcon } from "lucide-react";
import { StreakRoad } from "@/components/StreakRoad";
import { StreakAtRiskBanner } from "@/components/streak/StreakAtRiskBanner";
import { StreakCard } from "@/components/StreakCard";
import { InlineAlert } from "@/components/InlineAlert";
import { GemBalance } from "@/components/GemBalance";
import { FreezieBalance } from "@/components/FreezieBalance";
import { useGem } from "@/lib/gem-context";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/navigation/AppHeader";
import { alreadyCheckedInOnLocalDay } from "@/lib/check-in-gate";
import { hapticNotification } from "@/lib/native/haptics";

export default function StreakPage() {
  const { gemState } = useGem();
  const { unlockedLevel, unlockLevel } = useKai();
  const { t } = useLang();
  const { streak, isAuthenticated, isLoading, checkIn, profile } = useSession();
  const [showCard, setShowCard] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (streak.kaiUnlockedLevel > unlockedLevel) {
      unlockLevel(streak.kaiUnlockedLevel as 1 | 2 | 3 | 4);
    }
  }, [streak.kaiUnlockedLevel, unlockedLevel, unlockLevel]);

  const alreadyToday = alreadyCheckedInOnLocalDay(
    streak.lastCheckInDate,
    profile?.timezone ?? "UTC",
  );

  const handleCheckIn = async () => {
    if (!isAuthenticated || checkingIn || alreadyToday) return;
    setCheckingIn(true);
    setCheckInMsg(null);
    try {
      const result = await checkIn();
      setCheckInMsg({
        kind: "ok",
        text: t("streak.checkin_success", { streak: result.currentStreak }),
      });
      void hapticNotification("success");
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
      if (!already) void hapticNotification("error");
      else void hapticNotification("warning");
    } finally {
      setCheckingIn(false);
      setTimeout(() => setCheckInMsg(null), 4000);
    }
  };

  const currentStreak = streak.currentStreak;

  if (isLoading && isAuthenticated) {
    return (
      <div className="phone-shell flex flex-col px-4 pt-16">
        <div className="premium-skeleton h-8 w-32 rounded-lg" />
        <div className="premium-skeleton mt-6 h-64 rounded-2xl" />
        <p className="sr-only">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="phone-shell streak-page relative flex flex-col">
      <AppHeader
        backHref="/welcome"
        backLabel={t("nav.back")}
        title={t("nav.streak")}
        trailing={
          <>
            <button
              onClick={() => setShowCard(true)}
              className="app-header__action border-orange-500/25 bg-orange-500/10 text-orange-300"
              aria-label={t("streak.get_card")}
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <GemBalance balance={gemState.balance} size="sm" />
            <FreezieBalance
              size="sm"
              balance={isAuthenticated ? streak.freezieBalance : undefined}
            />
          </>
        }
      />

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
            disabled={checkingIn || alreadyToday}
            className="touch-44 w-full rounded-2xl border border-orange-300/20 bg-gradient-to-r from-orange-500/20 to-amber-500/10 px-4 py-2.5 text-sm font-semibold text-orange-100 shadow-lg shadow-orange-950/20 hover:border-orange-300/30 hover:from-orange-500/28 hover:to-amber-500/16 active:scale-[0.985] disabled:opacity-50"
          >
            {checkingIn
              ? t("common.loading")
              : alreadyToday
                ? t("streak.checkin_done")
                : t("streak.checkin_button")}
          </button>
          {checkInMsg && (
            <InlineAlert
              variant={checkInMsg.kind === "ok" ? "success" : "error"}
              message={checkInMsg.text}
              dismissLabel={t("common.dismiss")}
              onDismiss={() => setCheckInMsg(null)}
            />
          )}
        </div>
      )}

      <main className="flex flex-1 flex-col overflow-y-auto pb-8">
        <StreakRoad currentStreak={currentStreak} />
      </main>

      <StreakCard
        open={showCard}
        streak={currentStreak}
        kaiLevel={unlockedLevel}
        onClose={() => setShowCard(false)}
      />
    </div>
  );
}
