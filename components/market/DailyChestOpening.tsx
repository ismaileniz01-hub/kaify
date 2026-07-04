"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gift, Snowflake } from "lucide-react";
import { GemIcon } from "@/components/GemIcon";
import { ChromaKeyVideo } from "@/components/market/ChromaKeyVideo";
import { useLang } from "@/lib/lang-context";
import { useSound } from "@/lib/use-sound";
import {
  buildLoopingReel,
  rarityCardStyles,
  revealSoundForRarity,
  type ChestReelSlot,
} from "@/lib/chest-rewards";
import type { DailyChestClaimDTO } from "@/lib/services/daily-chest.service";

type Phase = "video" | "spin" | "reveal" | "done";

const CARD_W = 92;
const CARD_GAP = 10;
const CARD_STEP = CARD_W + CARD_GAP;
const SPIN_DURATION_MS = 5000;

/** px offset so card `index` sits under the centre selector (pl-[50%] layout). */
function offsetForCard(index: number): number {
  return index * CARD_STEP + CARD_W / 2;
}

function easeOutQuint(t: number): number {
  return 1 - (1 - t) ** 5;
}

function centeredCardIndex(offset: number): number {
  return Math.floor((offset - CARD_W / 2) / CARD_STEP);
}

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
      className={`flex h-[118px] w-[92px] shrink-0 flex-col items-center justify-between rounded-xl border py-2.5 px-1.5 text-center ${styles.card} ${
        highlight ? `scale-110 ring-2 ${styles.ring}` : ""
      }`}
      style={{ transition: highlight ? "transform 0.25s ease-out" : undefined }}
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

type Props = {
  claim: DailyChestClaimDTO;
  onClose: () => void;
};

export function DailyChestOpening({ claim, onClose }: Props) {
  const { t } = useLang();
  const { play } = useSound();
  const [phase, setPhase] = useState<Phase>("video");
  const [spinOffset, setSpinOffset] = useState(0);
  const [showRevealGlow, setShowRevealGlow] = useState(false);
  const rafRef = useRef<number>(0);
  const reelRef = useRef<HTMLDivElement>(null);
  const videoStartedRef = useRef(false);
  const playRef = useRef(play);
  playRef.current = play;

  const { reel, stopIndex } = useMemo(
    () =>
      claim.reel.length > 0
        ? { reel: claim.reel, stopIndex: claim.winningIndex }
        : buildLoopingReel(claim.reward),
    [claim.reel, claim.reward, claim.winningIndex],
  );

  const targetOffset = offsetForCard(stopIndex);
  const winnerStyles = rarityCardStyles(claim.reward.rarity);

  const finishReveal = useCallback(() => {
    setSpinOffset(targetOffset);
    setShowRevealGlow(true);
    setPhase("reveal");
    playRef.current(revealSoundForRarity(claim.reward.rarity));
  }, [claim.reward.rarity, targetOffset]);

  const startSpin = useCallback(() => {
    setPhase("spin");
    setSpinOffset(0);

    const start = performance.now();
    let lastTickIndex = -1;

    const frame = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / SPIN_DURATION_MS);
      const eased = easeOutQuint(progress);
      const offset = eased * targetOffset;

      if (reelRef.current) {
        reelRef.current.style.transform = `translate3d(-${offset}px, 0, 0)`;
      }

      const idx = centeredCardIndex(offset);
      if (idx > lastTickIndex) {
        playRef.current("jackpotTick");
        lastTickIndex = idx;
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setSpinOffset(targetOffset);
        finishReveal();
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(frame);
  }, [finishReveal, targetOffset]);

  const handleVideoEnded = useCallback(() => {
    startSpin();
  }, [startSpin]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const doneTimer = setTimeout(() => setPhase("done"), 1400);
    return () => clearTimeout(doneTimer);
  }, [phase]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
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
        {phase === "video" && (
          <ChromaKeyVideo
            src="/assets/chest-opening.mp4"
            className="w-full max-w-sm"
            onEnded={handleVideoEnded}
            onStart={() => {
              if (videoStartedRef.current) return;
              videoStartedRef.current = true;
            }}
            muted={false}
          />
        )}

        {(phase === "spin" || phase === "reveal" || phase === "done") && (
          <div className="w-full max-w-sm">
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-black/30 py-6">
              <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-0.5 -translate-x-1/2 bg-gradient-to-b from-transparent via-amber-300 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
              <div className="pointer-events-none absolute inset-y-2 left-1/2 z-10 w-[96px] -translate-x-1/2 rounded-xl border border-amber-400/20 bg-amber-400/5" />

              <div
                ref={reelRef}
                className="flex pl-[50%] will-change-transform"
                style={{
                  gap: CARD_GAP,
                  transform: `translate3d(-${spinOffset}px, 0, 0)`,
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
