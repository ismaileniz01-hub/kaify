"use client";

import Link from "next/link";
import { useState } from "react";
import { apiPost } from "@/lib/api/client";
import { CONSENT_TYPES } from "@/lib/legal/constants";
import { useLang } from "@/lib/lang-context";
import { MotionDialog } from "@/components/ui/MotionDialog";
import { useToast } from "@/components/ui/ToastProvider";

type PhotoAnalyzeConsentModalProps = {
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
};

export function PhotoAnalyzeConsentModal({
  open,
  onClose,
  onAccepted,
}: PhotoAnalyzeConsentModalProps) {
  const { t } = useLang();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const accept = async () => {
    if (!checked) return;
    setLoading(true);
    try {
      await apiPost("/api/consent", {
        consentType: CONSENT_TYPES.PHOTO_ANALYSIS,
        metadata: { source: "photo_analyze_modal" },
      });
      onAccepted();
    } catch {
      toast({ title: t("consent.error"), tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MotionDialog
      open={open}
      onClose={onClose}
      labelledBy="photo-consent-title"
      variant="sheet"
      className="z-[90]"
      panelClassName="w-full max-w-md rounded-t-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl sm:rounded-2xl"
    >
      <div data-sheet-scroll className="max-h-[70vh] overflow-y-auto">
        <h3 id="photo-consent-title" className="font-semibold text-white">{t("consent.photo.title")}</h3>
        <p className="mt-2 text-sm text-zinc-400">{t("consent.photo.desc")}</p>
        <label className="mt-4 flex cursor-pointer gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5"
          />
          {t("consent.photo.checkbox")}
        </label>
        <p className="mt-2 text-xs text-zinc-500">
          <Link href="/privacy" className="text-emerald-400 underline">
            {t("login.privacy_link")}
          </Link>
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm"
          >
            {t("common.dismiss")}
          </button>
          <button
            type="button"
            disabled={!checked || loading}
            onClick={() => void accept()}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? t("common.loading") : t("consent.photo.continue")}
          </button>
        </div>
      </div>
    </MotionDialog>
  );
}
