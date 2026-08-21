"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api/client";
import {
  CONSENT_TYPES,
  PRIVACY_PATH,
  PRIVACY_VERSION,
  TERMS_PATH,
  TERMS_VERSION,
} from "@/lib/legal/constants";
import { useLang } from "@/lib/lang-context";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";
import { MotionDialog } from "@/components/ui/MotionDialog";

const SKIP_PREFIXES = ["/login", "/signup", "/privacy", "/terms", "/cookies", "/api/"];

type ConsentStatus = {
  termsPrivacy: boolean;
  aiHealth: boolean;
  photoAnalysis: boolean;
};

/**
 * Blocks AI features until Terms/Privacy (current policy version) and
 * health+AI consent are recorded. Version bumps after a legal pack require
 * re-accept — without this gate chat returns 403 FORBIDDEN.
 */
export function AiConsentGate() {
  const { t } = useLang();
  const pathname = usePathname();
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [healthChecked, setHealthChecked] = useState(false);
  const [aiChecked, setAiChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsTerms = status !== null && !status.termsPrivacy;
  const needsAi = status !== null && !status.aiHealth;
  const open = needsTerms || needsAi;

  useEffect(() => {
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
      setStatus(null);
      return;
    }

    void (async () => {
      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) return;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus(null);
        return;
      }

      try {
        const next = await apiGet<ConsentStatus>("/api/consent");
        setStatus(next);
      } catch {
        setStatus(null);
      }
    })();
  }, [pathname]);

  const submit = async () => {
    if (needsTerms && !termsChecked) return;
    if (needsAi && (!healthChecked || !aiChecked)) return;
    setLoading(true);
    setError(null);
    try {
      if (needsTerms) {
        await apiPost("/api/consent", {
          consentType: CONSENT_TYPES.TERMS_PRIVACY,
          metadata: {
            termsVersion: TERMS_VERSION,
            privacyVersion: PRIVACY_VERSION,
            source: "app_reconsent_gate",
          },
        });
      }
      if (needsAi) {
        await apiPost("/api/consent", {
          consentType: CONSENT_TYPES.AI_HEALTH,
          metadata: { healthData: true, aiProcessing: true },
        });
      }
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              termsPrivacy: prev.termsPrivacy || needsTerms,
              aiHealth: prev.aiHealth || needsAi,
            }
          : prev,
      );
    } catch {
      setError(t("consent.error"));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = needsTerms
    ? termsChecked && (!needsAi || (healthChecked && aiChecked))
    : healthChecked && aiChecked;

  return (
    <MotionDialog
      open={open}
      labelledBy="ai-consent-title"
      variant="sheet"
      closeOnBackdrop={false}
      className="z-[120]"
      panelClassName="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl sm:rounded-2xl"
    >
      <div data-sheet-scroll>
        <h2 id="ai-consent-title" className="text-lg font-bold text-white">
          {needsTerms ? t("consent.terms.title") : t("consent.ai.title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {needsTerms ? t("consent.terms.desc") : t("consent.ai.desc")}
        </p>

        {needsTerms ? (
          <label className="mt-4 flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <input
              type="checkbox"
              checked={termsChecked}
              onChange={(e) => setTermsChecked(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-zinc-300">
              {t("consent.terms.accept_box")}{" "}
              <Link href={TERMS_PATH} className="text-emerald-400 underline">
                {t("login.terms_link")}
              </Link>{" "}
              {t("common.and")}{" "}
              <Link href={PRIVACY_PATH} className="text-emerald-400 underline">
                {t("login.privacy_link")}
              </Link>
              .
            </span>
          </label>
        ) : null}

        {needsAi ? (
          <>
            <label className="mt-4 flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <input
                type="checkbox"
                checked={healthChecked}
                onChange={(e) => setHealthChecked(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-zinc-300">{t("consent.ai.health")}</span>
            </label>

            <label className="mt-2 flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <input
                type="checkbox"
                checked={aiChecked}
                onChange={(e) => setAiChecked(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-zinc-300">
                {t("consent.ai.processing")}
              </span>
            </label>
          </>
        ) : null}

        <p className="mt-3 text-xs text-zinc-500">
          {t("consent.ai.footer")}{" "}
          <Link href={PRIVACY_PATH} className="text-emerald-400 underline">
            {t("login.privacy_link")}
          </Link>
        </p>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <button
          type="button"
          disabled={loading || !canSubmit}
          onClick={() => void submit()}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading
            ? t("common.loading")
            : needsTerms
              ? t("consent.terms.accept")
              : t("consent.ai.accept")}
        </button>
      </div>
    </MotionDialog>
  );
}
