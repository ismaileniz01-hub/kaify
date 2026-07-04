"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gift, Sparkles, Snowflake } from "lucide-react";
import { GemIcon } from "@/components/GemIcon";
import { useLang } from "@/lib/lang-context";
import { useSound } from "@/lib/use-sound";
import {
  buildLoopingReel,
  rarityCardStyles,
  revealSoundForRarity,
  type ChestReelSlot,
} from "@/lib/chest-rewards";
import type { DailyChestClaimDTO } from "@/lib/services/daily-chest.service";

type Phase = "drop" | "shake" | "open" | "spin" | "reveal" | "done";

const CARD_W = 92;
const CARD_GAP = 10;
const CARD_STEP = CARD_W + CARD_GAP;
const REEL_VIEWPORT_W = 288;

function RewardCard({
  slot,
  t,
  highlight,
}: {
  slot: ChestReelSlot;
  t: (k: string) => string;
  highlight?: boolean;
}) {
  const styles = rarityCardStyles(slot.rarity);

  return (
    <div
      className={`flex h-[118px] w-[92px] shrink-0 flex-col items-center justify-between rounded-xl border py-2.5 px-1.5 text-center transition-transform duration-300 ${styles.card} ${
        highlight ? `scale-110 ring-2 ${styles.ring}` : ""
      }`}
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        {slot.kind === "gems" ? (
          <GemIcon size={26} sparkle={highlight} />
        ) : (
          <Snowflake className="h-7 w-7 text-cyan-300" strokeWidth={2} />
        )}
        <p className="mt-1.5 text-base font-extrabold text-white">
          {slot.kind === "gems" ? slot.amount : `+${slot.amount}`}
        </p>
      </div>
      <p className={`text-[8px] font-bold uppercase tracking-wider ${styles.label}`}>
        {t(slot.rarityKey)}
      </p>
    </div>
  );
}

function KaiChest({ shaking, open }: { shaking: boolean; open: boolean }) {
  return (
    <div className={`relative ${shaking ? "chest-shake" : ""} ${open ? "chest-open-burst" : ""}`}>
      <div className="relative mx-auto h-28 w-32">
        <div className="absolute inset-x-2 bottom-0 h-16 rounded-b-2xl rounded-t-lg border-2 border-purple-400/40 bg-gradient-to-b from-purple-600 to-violet-900 shadow-[0_8px_32px_rgba(124,58,237,0.45)]">
          <div className="absolute inset-x-3 top-3 h-1 rounded-full bg-purple-300/30" />
          <div className="absolute inset-x-3 top-6 h-1 rounded-full bg-purple-300/20" />
          <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400/50 bg-amber-500/20">
            <Sparkles className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-amber-300" />
          </div>
        </div>
        <div
          className={`absolute inset-x-4 top-0 h-10 origin-bottom rounded-t-xl border-2 border-b-0 border-purple-300/50 bg-gradient-to-b from-purple-400 to-purple-700 transition-transform duration-500 ${
            open ? "-translate-y-6 -rotate-[28deg] opacity-80" : ""
          }`}
        />
      </div>
      {open && (
        <>
          <span className="chest-ray chest-ray--1" />
          <span className="chest-ray chest-ray--2" />
          <span className="chest-ray chest-ray--3" />
          <span className="chest-ray chest-ray--4" />
        </>
      )}
    </div>
  );
}

type Props = {
  claim: DailyChestClaimDTO;
  onClose: () => void;
};

export function DailyChestOpening({ claim, onClose }: Props) {
  const { t } = useLang();
  const { play } = useSound();
  const [phase, setPhase] = useState<Phase>("drop");
  const [spinOffset, setSpinOffset] = useState(0);
  const [showRevealGlow, setShowRevealGlow] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { reel, stopIndex } = useMemo(
    () =>
      claim.reel.length > 0
        ? { reel: claim.reel, stopIndex: claim.winningIndex }
        : buildLoopingReel(claim.reward),
    [claim.reel, claim.reward, claim.winningIndex],
  );

  const winnerStyles = rarityCardStyles(claim.reward.rarity);

  useEffect(() => {
    play("chestDrop");
    const landTimer = setTimeout(() => play("chestLand"), 720);
    const shakeTimer = setTimeout(() => setPhase("shake"), 900);
    return () => {
      clearTimeout(landTimer);
      clearTimeout(shakeTimer);
    };
  }, [play]);

  useEffect(() => {
    if (phase !== "shake") return;
    const openTimer = setTimeout(() => {
      setPhase("open");
      play("chestOpen");
      setTimeout(() => play("chestPop"), 180);
    }, 2200);
    return () => clearTimeout(openTimer);
  }, [phase, play]);

  useEffect(() => {
    if (phase !== "open") return;
    const spinTimer = setTimeout(() => {
      setPhase("spin");
      const offset = stopIndex * CARD_STEP - (REEL_VIEWPORT_W / 2 - CARD_W / 2);
      setSpinOffset(0);
      requestAnimationFrame(() => {
        setSpinOffset(offset);
      });
      tickRef.current = setInterval(() => play("jackpotTick"), 90);
    }, 700);
    return () => clearTimeout(spinTimer);
  }, [phase, play, stopIndex]);

  useEffect(() => {
    if (phase !== "spin") return;
    const revealTimer = setTimeout(() => {
      if (tickRef.current) clearInterval(tickRef.current);
      setPhase("reveal");
      setShowRevealGlow(true);
      play(revealSoundForRarity(claim.reward.rarity));
    }, 4200);
    return () => clearTimeout(revealTimer);
  }, [phase, play, claim.reward.rarity]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const doneTimer = setTimeout(() => setPhase("done"), 1400);
    return () => clearTimeout(doneTimer);
  }, [phase]);

  useEffect(
    () => () => {
      if (tickRef.current) clearInterval(tickRef.current);
    },
    [],
  );

  const handleCollect = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-[#0f0720] via-[#1a0a2e] to-[#0a0514]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -right-16 bottom-32 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 px-6 pt-14 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-purple-300/70">
          {t("chest.opening_title")}
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">{t("chest.opening_sub")}</h2>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4">
        {(phase === "drop" || phase === "shake" || phase === "open") && (
          <div className={phase === "drop" ? "chest-drop-in" : ""}>
            <KaiChest shaking={phase === "shake"} open={phase === "open"} />
          </div>
        )}

        {(phase === "spin" || phase === "reveal" || phase === "done") && (
          <div className="w-full max-w-sm">
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-black/30 py-6">
              <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-0.5 -translate-x-1/2 bg-gradient-to-b from-transparent via-amber-300 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
              <div className="pointer-events-none absolute inset-y-2 left-1/2 z-10 w-[96px] -translate-x-1/2 rounded-xl border border-amber-400/20 bg-amber-400/5" />

              <div
                className="flex pl-[50%] transition-transform duration-[3800ms] ease-[cubic-bezier(0.12,0.85,0.15,1)]"
                style={{
                  gap: CARD_GAP,
                  transform: `translateX(-${spinOffset}px)`,
                }}
              >
                {reel.map((slot, i) => (
                  <RewardCard
                    key={`${slot.rarity}-${slot.amount}-${slot.kind}-${i}`}
                    slot={slot}
                    t={t}
                    highlight={showRevealGlow && i === stopIndex}
                  />
                ))}
              </div>

              {showRevealGlow && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className={`h-32 w-32 animate-ping rounded-full ${winnerStyles.glow}`} />
                </div>
              )}
            </div>

            {(phase === "reveal" || phase === "done") && (
              <div className="mt-6 text-center animate-in fade-in">
                <p className="text-sm text-purple-200/80">{t("chest.you_won")}</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  {claim.reward.kind === "gems" ? (
                    <>
                      <GemIcon size={22} sparkle />
                      <p className={`text-xl font-bold ${winnerStyles.label}`}>
                        +{claim.reward.amount}
                      </p>
                    </>
                  ) : (
                    <>
                      <Snowflake className="h-6 w-6 text-cyan-300" />
                      <p className="text-xl font-bold text-cyan-200">+{claim.reward.amount}</p>
                    </>
                  )}
                </div>
                <p className={`mt-1 text-xs font-bold uppercase tracking-wider ${winnerStyles.label}`}>
                  {t(claim.reward.rarityKey)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {phase === "done" && (
        <footer className="relative z-10 px-6 pb-10">
          <button
            type="button"
            onClick={handleCollect}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-600 py-4 text-base font-bold text-white shadow-[0_8px_32px_rgba(124,58,237,0.45)] transition active:scale-[0.98]"
          >
            <Gift className="h-5 w-5" />
            {t("chest.collect")}
          </button>
        </footer>
      )}
    </div>
  );
}
