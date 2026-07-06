"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Loader2, Snowflake } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { InlineAlert } from "@/components/InlineAlert";

type PendingGift = {
  id: string;
  rewardKind: "gems" | "freezie";
  amount: number;
  reason: string;
  createdAt: string;
};

export function PendingGiftCard() {
  const { t } = useLang();
  const { isAuthenticated, refreshSession } = useSession();
  const [gifts, setGifts] = useState<PendingGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimedId, setClaimedId] = useState<string | null>(null);

  const loadGifts = useCallback(async () => {
    if (!isAuthenticated) {
      setGifts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiGet<{ items: PendingGift[] }>("/api/gifts/pending");
      setGifts(res.items);
      setError(null);
    } catch {
      setGifts([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadGifts();
  }, [loadGifts]);

  const handleClaim = async (giftId: string) => {
    if (claimingId) return;
    setClaimingId(giftId);
    setError(null);
    try {
      await apiPost("/api/gifts/claim", { giftId });
      setClaimedId(giftId);
      setGifts((prev) => prev.filter((g) => g.id !== giftId));
      await refreshSession();
      setTimeout(() => setClaimedId(null), 2500);
    } catch {
      setError(t("gift.claim.error"));
    } finally {
      setClaimingId(null);
    }
  };

  if (!isAuthenticated || loading || gifts.length === 0) {
    return null;
  }

  return (
    <section className="mt-4 space-y-3 px-4">
      {gifts.map((gift) => {
        const isGems = gift.rewardKind === "gems";
        const busy = claimingId === gift.id;
        const justClaimed = claimedId === gift.id;

        return (
          <div
            key={gift.id}
            className="animate-in overflow-hidden rounded-2xl border border-purple-400/25 bg-gradient-to-br from-purple-500/15 via-fuchsia-500/10 to-indigo-500/10 p-4 shadow-lg shadow-purple-950/30"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                {isGems ? (
                  <Gift className="h-5 w-5 text-amber-300" />
                ) : (
                  <Snowflake className="h-5 w-5 text-cyan-300" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  {isGems
                    ? t("gift.card.title_gems", { amount: gift.amount })
                    : t("gift.card.title_freezie", { amount: gift.amount })}
                </p>
                {gift.reason && (
                  <p className="mt-0.5 text-xs text-zinc-400">{gift.reason}</p>
                )}
                <p className="mt-1 text-[11px] text-zinc-500">{t("gift.card.subtitle")}</p>
              </div>
            </div>

            {justClaimed ? (
              <p className="mt-3 text-center text-sm font-medium text-emerald-300">
                {isGems
                  ? t("gift.claim.success_gems", { amount: gift.amount })
                  : t("gift.claim.success_freezie", { amount: gift.amount })}
              </p>
            ) : (
              <button
                type="button"
                disabled={busy || claimingId !== null}
                onClick={() => void handleClaim(gift.id)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("gift.claim.button")}
              </button>
            )}
          </div>
        );
      })}

      {error && (
        <InlineAlert variant="error" message={error} onDismiss={() => setError(null)} />
      )}
    </section>
  );
}
