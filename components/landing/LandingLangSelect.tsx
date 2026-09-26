"use client";

import { LANG_OPTIONS, useLang, type LangCode } from "@/lib/lang-context";

export function LandingLangSelect({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useLang();

  return (
    <label className={`landing-lang ${className}`}>
      <span className="sr-only">{t("landing.nav.language")}</span>
      <select
        className="landing-lang-select"
        value={lang}
        onChange={(event) => setLang(event.target.value as LangCode)}
      >
        {LANG_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
