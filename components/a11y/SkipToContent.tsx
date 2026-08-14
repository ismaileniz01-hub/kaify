"use client";

import { useLang } from "@/lib/lang-context";

export function SkipToContent() {
  const { t } = useLang();
  return (
    <a href="#main-content" className="skip-to-content">
      {t("a11y.skip_to_content")}
    </a>
  );
}
