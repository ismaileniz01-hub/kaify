"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Timer } from "lucide-react";
import { KaiChestImage } from "./KaiChestImage";
import { InlineAlert } from "@/components/InlineAlert";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { apiGet, apiPost, ApiClientError } from "@/lib/api/client";
import { errorToMessage } from "@/lib/i18n/api-error";
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

function nextUtcMidnightIso(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

export function DailyChestBanner({ onClaimed }: Props) {
  const { t } = useLang();
  const { isAuthenticated } = useSession();
  const [status, setStatus] = useState<DailyChestStatusDTO | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [claimData, setClaimData] = useState<DailyChestClaimDTO | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [countdown, setCountdown] = useState("");

  const loadStatus = useCallback(() => {
    if (!isAuthenticated) {
      setStatusLoading(false);
      setStatus(null);
      setStatusError(false);
      return;
    }
    setStatusLoading(true);
    setStatusError(false);
    setClaimError(null);
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
    if (!isAuthenticated) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") loadStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isAuthenticated, loadStatus]);

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

  const markClaimedToday = useCallback(() => {
    setStatus((prev) => ({
      canClaim: false,
      nextClaimAt: prev?.nextClaimAt ?? nextUtcMidnightIso(),
      utcDate: prev?.utcDate ?? new Date().toISOString().slice(0, 10),
    }));
  }, []);

  const canClaim = status?.canClaim ?? false;
  const showClaimed = !statusLoading && status !== null && !canClaim;

  const handleOpen = async () => {
    if (!isAuthenticated || claimLoading || statusLoading) return;
    if (status && !status.canClaim) return;

    setClaimLoading(true);
    setClaimError(null);
    setInfoMessage(null);
    try {
      const result = await apiPost<DailyChestClaimDTO>("/api/market/chest");
      if (result.alreadyClaimed) {
        markClaimedToday();
        setInfoMessage(t("chest.already_claimed"));
        loadStatus();
        return;
      }
      setClaimData(result);
      setOpening(true);
      markClaimedToday();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CONFLICT") {
        markClaimedToday();
        setInfoMessage(t("chest.already_claimed"));
        loadStatus();
        return;
      }
      setClaimError(errorToMessage(err, t) || t("chest.claim_failed"));
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
          <KaiChestImage size={72} pulse={canClaim && !statusLoading} />

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
          </div>
        </div>

        {statusError && !status && (
          <InlineAlert
            className="mt-3"
            message={t("chest.error")}
            dismissLabel={t("common.dismiss")}
            onDismiss={() => setStatusError(false)}
            onRetry={loadStatus}
            retryLabel={t("common.retry")}
          />
        )}
        {claimError && (
          <InlineAlert
            className="mt-3"
            message={claimError}
            dismissLabel={t("common.dismiss")}
            onDismiss={() => setClaimError(null)}
          />
        )}
        {infoMessage && (
          <InlineAlert
            variant="info"
            className="mt-3"
            message={infoMessage}
            dismissLabel={t("common.dismiss")}
            onDismiss={() => setInfoMessage(null)}
          />
        )}

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
