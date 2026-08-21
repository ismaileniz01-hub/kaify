"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api/client";
import { REFERRAL_APPLIED_EVENT } from "@/lib/referral";
import { useLang } from "@/lib/lang-context";
import { useKai } from "@/lib/kai-context";
import { useSession } from "@/lib/session-context";
import { MarketAuraPreview } from "@/components/market/MarketAuraPreview";
import { MotionDialog } from "@/components/ui/MotionDialog";
import { usePathname } from "next/navigation";

type ClaimStatus = {
  eligible: boolean;
  claimed: boolean;
  skinId: "thunder";
  referredByCode: string | null;
};

type ClaimResult = {
  claimed: boolean;
  alreadyOwned: boolean;
  skinId: "thunder";
  activeAura: string;
};

const SKIP_PREFIXES = [
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/cookies",
  "/disclaimer",
  "/kvkk",
  "/api/",
];

/**
 * After a successful referral apply, invitees see Thunder redeem (Al).
 * Claiming grants inventory + equips the aura.
 */
export function ReferralRewardRedeem() {
  const pathname = usePathname();
  const { t } = useLang();
  const { isAuthenticated, isLoading, profile } = useSession();
  const { syncFromServer, ownedEffects } = useKai();
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || isLoading) {
      setEligible(false);
      return;
    }
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
      setEligible(false);
      return;
    }
    // Wait until profile onboarding is past PAID gate so we don't stack modals.
    if (profile?.onboardingStatus === "PAID") {
      setEligible(false);
      return;
    }
    try {
      const status = await apiGet<ClaimStatus>("/api/referral/claim");
      setEligible(status.eligible);
    } catch {
      setEligible(false);
    }
  }, [isAuthenticated, isLoading, pathname, profile?.onboardingStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onApplied = () => {
      void refresh();
    };
    window.addEventListener(REFERRAL_APPLIED_EVENT, onApplied);
    return () => window.removeEventListener(REFERRAL_APPLIED_EVENT, onApplied);
  }, [refresh]);

  const handleClaim = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiPost<ClaimResult>("/api/referral/claim", {});
      const nextOwned = Array.from(
        new Set([...ownedEffects, "thunder" as const]),
      );
      syncFromServer(nextOwned, result.activeAura);
      setDone(true);
      setEligible(false);
      setTimeout(() => setDone(false), 2200);
    } catch {
      setError(t("referral.redeem.error"));
    } finally {
      setBusy(false);
    }
  };

  const open = eligible || done;

  return (
    <MotionDialog
      open={open}
      labelledBy="referral-redeem-title"
      closeOnBackdrop={false}
      className="z-[90] bg-black/80"
      panelClassName="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl border border-violet-400/25 bg-zinc-950 shadow-2xl shadow-violet-950/40"
    >
      <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
        <MarketAuraPreview auraId="thunder" />
        <h2
          id="referral-redeem-title"
          className="mt-4 text-lg font-semibold text-white"
        >
          {done ? t("referral.redeem.success_title") : t("referral.redeem.title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {done
            ? t("referral.redeem.success_body")
            : t("referral.redeem.body")}
        </p>

        {error ? (
          <p className="mt-3 text-xs text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        {!done ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleClaim()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-violet-950/40 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {busy ? t("referral.redeem.claiming") : t("referral.redeem.claim")}
          </button>
        ) : null}
      </div>
    </MotionDialog>
  );
}
