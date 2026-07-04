"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Timer } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
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
  const { isAuthenticated } = useSession();
  const [status, setStatus] = useState<DailyChestStatusDTO | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState(false);
  const [opening, setOpening] = useState(false);
  const [claimData, setClaimData] = useState<DailyChestClaimDTO | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [countdown, setCountdown] = useState("");

  const loadStatus = useCallback(() => {
    if (!isAuthenticated) {
      setStatusLoading(false);
      setStatus(null);
      return;
    }
    setStatusLoading(true);
    setStatusError(false);
    apiGet<DailyChestStatusDTO>("/api/market/chest")
      .then((data) => {
        setStatus(data);
        setStatusError(false);
      })
      .catch(() => {
        setStatus(null);
        setStatusError(true);
      })
      .finally(() => setStatusLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!status?.nextClaimAt || status.canClaim) {
      setCountdown("");
      return;
    }
    const tick = () => setCountdown(formatCountdown(status.nextClaimAt!));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status?.nextClaimAt, status?.canClaim]);

  const canClaim = status?.canClaim ?? false;
  const showClaimed = !statusLoading && status !== null && !canClaim;

  const handleOpen = async () => {
    if (!isAuthenticated || claimLoading || statusLoading) return;
    if (status && !status.canClaim) return;

    setClaimLoading(true);
    try {
      const result = await apiPost<DailyChestClaimDTO>("/api/market/chest");
      setClaimData(result);
      setOpening(true);
      setStatusError(false);
    } catch {
      setStatusError(true);
    } finally {
      setClaimLoading(false);
    }
  };

  const handleClose = () => {
    setOpening(false);
    setClaimData(null);
    onClaimed?.();
    loadStatus();
  };

  const buttonLabel = (() => {
    if (!isAuthenticated) return t("chest.login_required");
    if (statusLoading || claimLoading) return t("chest.loading");
    if (statusError && !status) return t("chest.retry");
    if (showClaimed) return t("chest.claimed");
    return t("chest.claim");
  })();

  const buttonDisabled =
    !isAuthenticated ||
    statusLoading ||
    claimLoading ||
    (status !== null && !status.canClaim && !statusError);

  return (
    <>
      <div className="w-full shrink-0 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-950/55 via-purple-950/45 to-violet-950/55 p-4 shadow-[0_8px_32px_rgba(124,58,237,0.25)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">
          {t("chest.daily_label")}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center">
            <div className="absolute inset-0 animate-pulse rounded-2xl bg-amber-400/10" />
            <div className="relative flex h-16 w-16 flex-col items-center justify-end rounded-xl border-2 border-purple-400/50 bg-gradient-to-b from-purple-500 to-violet-800 shadow-lg">
              <div className="mb-1 h-3 w-9 rounded-t-md border border-b-0 border-purple-300/40 bg-purple-400/80" />
              <Gift className="mb-1.5 h-5 w-5 text-amber-300" strokeWidth={2} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold leading-tight text-white">
              {t("chest.daily_title")}
            </h3>
            <p className="mt-1 text-[11px] leading-snug text-zinc-400">
              {t("chest.daily_desc")}
            </p>
            {showClaimed && countdown && (
              <p className="mt-1.5 flex items-center gap-1 text-[10px] text-purple-300">
                <Timer className="h-3 w-3 shrink-0" />
                {t("chest.next_in", { time: countdown })}
              </p>
            )}
            {statusError && (
              <p className="mt-1.5 text-[10px] text-red-300">{t("chest.error")}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (statusError && !status) {
              loadStatus();
              return;
            }
            void handleOpen();
          }}
          disabled={buttonDisabled && !(statusError && !status)}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition active:scale-[0.98] ${
            !buttonDisabled || (statusError && !status)
              ? "bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-900 shadow-[0_4px_16px_rgba(251,191,36,0.4)]"
              : "cursor-not-allowed border border-zinc-700 bg-zinc-800/60 text-zinc-500"
          }`}
        >
          <Gift className="h-4 w-4" />
          {buttonLabel}
        </button>
      </div>

      {opening && claimData && (
        <DailyChestOpening claim={claimData} onClose={handleClose} />
      )}
    </>
  );
}
