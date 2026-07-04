"use client";

import { useEffect, useState } from "react";
import { Gift, Timer } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { apiGet, apiPost } from "@/lib/api/client";
import type {
  DailyChestClaimDTO,
  DailyChestStatusDTO,
} from "@/lib/services/daily-chest.service";
import { DailyChestOpening } from "./DailyChestOpening";

type Props = {
  onClaimed?: () => void;
};

function formatCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "00:00:00";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function DailyChestBanner({ onClaimed }: Props) {
  const { t } = useLang();
  const [status, setStatus] = useState<DailyChestStatusDTO | null>(null);
  const [opening, setOpening] = useState(false);
  const [claimData, setClaimData] = useState<DailyChestClaimDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    apiGet<DailyChestStatusDTO>("/api/market/chest")
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    if (!status?.nextClaimAt) {
      setCountdown("");
      return;
    }
    const tick = () => setCountdown(formatCountdown(status.nextClaimAt!));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status?.nextClaimAt]);

  const handleOpen = async () => {
    if (loading || !status?.canClaim) return;
    setLoading(true);
    try {
      const result = await apiPost<DailyChestClaimDTO>("/api/market/chest");
      setClaimData(result);
      setOpening(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpening(false);
    setClaimData(null);
    setStatus((prev) =>
      prev
        ? { ...prev, canClaim: false, nextClaimAt: new Date(Date.now() + 86_400_000).toISOString() }
        : prev,
    );
    onClaimed?.();
    apiGet<DailyChestStatusDTO>("/api/market/chest").then(setStatus).catch(() => undefined);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-950/50 via-purple-950/40 to-violet-950/50 p-4 shadow-[0_8px_32px_rgba(124,58,237,0.25)]">
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-purple-500/15 blur-2xl" />

        <div className="relative flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <div className="absolute inset-0 animate-pulse rounded-2xl bg-amber-400/10" />
            <div className="relative flex h-14 w-14 flex-col items-center justify-end rounded-xl border-2 border-purple-400/40 bg-gradient-to-b from-purple-500 to-violet-800 shadow-lg">
              <div className="mb-1 h-3 w-8 rounded-t-md border border-b-0 border-purple-300/40 bg-purple-400/80" />
              <Gift className="mb-1.5 h-5 w-5 text-amber-300" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
              {t("chest.daily_label")}
            </p>
            <h3 className="text-sm font-bold text-white">{t("chest.daily_title")}</h3>
            <p className="mt-0.5 text-[11px] text-zinc-400">{t("chest.daily_desc")}</p>
            {!status?.canClaim && countdown && (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-purple-300">
                <Timer className="h-3 w-3" />
                {t("chest.next_in", { time: countdown })}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpen}
            disabled={!status?.canClaim || loading}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition active:scale-95 ${
              status?.canClaim
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-900 shadow-[0_4px_16px_rgba(251,191,36,0.4)]"
                : "cursor-not-allowed border border-zinc-700 bg-zinc-800/60 text-zinc-500"
            }`}
          >
            {loading ? "..." : status?.canClaim ? t("chest.claim") : t("chest.claimed")}
          </button>
        </div>
      </div>

      {opening && claimData && (
        <DailyChestOpening claim={claimData} onClose={handleClose} />
      )}
    </>
  );
}
