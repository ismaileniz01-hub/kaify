"use client";

import { useLang } from "@/lib/lang-context";

/** Persistent in-app disclaimer — not medical advice. */
export function LegalDisclaimerBanner() {
  const { t } = useLang();

  return (
    <div
      role="note"
      className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center text-xs leading-snug text-amber-100/90"
    >
      {t("consent.disclaimer.banner")}
    </div>
  );
}
