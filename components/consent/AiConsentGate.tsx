"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api/client";
import { CONSENT_TYPES } from "@/lib/legal/constants";
import { useLang } from "@/lib/lang-context";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

const SKIP_PREFIXES = ["/login", "/privacy", "/terms", "/cookies", "/api/"];

type ConsentStatus = {
  termsPrivacy: boolean;
  aiHealth: boolean;
  photoAnalysis: boolean;
};

/**
 * Blocks AI features until explicit health + AI consent is recorded (GDPR Art. 9).
 */
export function AiConsentGate() {
  const { t } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [healthChecked, setHealthChecked] = useState(false);
  const [aiChecked, setAiChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
      setOpen(false);
      return;
    }

    void (async () => {
      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setOpen(false);
        return;
      }

      try {
        const status = await apiGet<ConsentStatus>("/api/consent");
        setOpen(!status.aiHealth);
      } catch {
        setOpen(false);
      }
    })();
  }, [pathname]);

  const submit = async () => {
    if (!healthChecked || !aiChecked) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/consent", {
        consentType: CONSENT_TYPES.AI_HEALTH,
        metadata: { healthData: true, aiProcessing: true },
      });
      setOpen(false);
    } catch {
      setError(t("consent.error"));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-consent-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
      >
        <h2 id="ai-consent-title" className="text-lg font-bold text-white">
          {t("consent.ai.title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t("consent.ai.desc")}</p>

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
          <span className="text-sm text-zinc-300">{t("consent.ai.processing")}</span>
        </label>

        <p className="mt-3 text-xs text-zinc-500">
          {t("consent.ai.footer")}{" "}
          <Link href="/privacy" className="text-emerald-400 underline">
            {t("login.privacy_link")}
          </Link>
        </p>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <button
          type="button"
          disabled={loading || !healthChecked || !aiChecked}
          onClick={() => void submit()}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("consent.ai.accept")}
        </button>
      </div>
    </div>
  );
}
