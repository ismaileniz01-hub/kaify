"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuthMode } from "@/lib/auth/safe-redirect";
import { useLang } from "@/lib/lang-context";

type Props = {
  mode: AuthMode;
  redirectTo?: string;
};

export function AuthModeToggle({ mode, redirectTo }: Props) {
  const { t } = useLang();
  const router = useRouter();

  const setMode = (next: AuthMode) => {
    if (next === mode) return;
    const params = new URLSearchParams({ mode: next });
    if (redirectTo && redirectTo !== "/welcome") {
      params.set("next", redirectTo);
    }
    router.replace(`/login?${params.toString()}`);
  };

  return (
    <div className="auth-mode-toggle" role="tablist" aria-label={t("login.mode.label")}>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "signup"}
        className={`auth-mode-toggle__btn ${
          mode === "signup" ? "auth-mode-toggle__btn--active" : ""
        }`}
        onClick={() => setMode("signup")}
      >
        {t("login.mode.signup")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "signin"}
        className={`auth-mode-toggle__btn ${
          mode === "signin" ? "auth-mode-toggle__btn--active" : ""
        }`}
        onClick={() => setMode("signin")}
      >
        {t("login.mode.signin")}
      </button>
    </div>
  );
}

type LegalConsentProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function LegalConsentCheckbox({ checked, onChange }: LegalConsentProps) {
  const { t } = useLang();

  return (
    <label className="auth-legal-consent">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="auth-legal-consent__input"
      />
      <span className="auth-legal-consent__text">
        {t("login.legal_prefix")}{" "}
        <Link href="/terms" className="auth-legal-consent__link">
          {t("login.terms_link")}
        </Link>{" "}
        {t("login.legal_and")}{" "}
        <Link href="/privacy" className="auth-legal-consent__link">
          {t("login.privacy_link")}
        </Link>
      </span>
    </label>
  );
}
