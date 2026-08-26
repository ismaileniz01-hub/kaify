"use client";

import { useLang } from "@/lib/lang-context";

/** Screen-reader loading label that follows the `kaify-lang` cookie. */
export function SrOnlyLoading() {
  const { t } = useLang();
  return <p className="sr-only">{t("common.loading")}</p>;
}
