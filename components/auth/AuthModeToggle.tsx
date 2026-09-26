"use client";

import Link from "next/link";
import type { AuthMode } from "@/lib/auth/safe-redirect";
import { useLang } from "@/lib/lang-context";
import { useNativeApp } from "@/lib/native/platform";

type Props = {
  mode: AuthMode;
  redirectTo?: string;
};

export function AuthModeToggle({ mode, redirectTo }: Props) {
  const { t } = useLang();
  const native = useNativeApp();

  const signinHref = (() => {
    const params = new URLSearchParams({ mode: "signin" });
    if (redirectTo && redirectTo !== "/welcome") {
      params.set("next", redirectTo);
    }
    return `/login?${params.toString()}`;
  })();

  const signupHref = (() => {
    const params = new URLSearchParams();
    if (redirectTo && redirectTo !== "/welcome") {
      params.set("next", redirectTo);
    }
    const q = params.toString();
    return q ? `/signup?${q}` : "/signup";
  })();

  if (mode === "signup") {
    return (
      <p className="text-center text-sm text-zinc-400">
        {t("signup.already_account")}{" "}
        <Link href={signinHref} className="font-medium text-purple-300 hover:text-white">
          {t("login.mode.signin")}
        </Link>
      </p>
    );
  }

  // Consumption-only native builds must not link users into an external
  // purchase/signup flow. The website can deep-link back after checkout.
  if (native !== false) {
    if (native === null) {
      return <span className="block h-5" aria-hidden />;
    }
    return (
      <p className="max-w-xs text-center text-sm leading-relaxed text-zinc-400">
        {t("login.native.account_notice")}
      </p>
    );
  }

  return (
    <p className="text-center text-sm text-zinc-400">
      {t("signup.no_account")}{" "}
      <Link href={signupHref} className="font-medium text-purple-300 hover:text-white">
        {t("login.mode.signup")}
      </Link>
    </p>
  );
}

type LegalConsentProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function LegalConsentCheckbox({ checked, onChange }: LegalConsentProps) {
  const { t } = useLang();

  return (
    <div className="flex flex-col gap-2">
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
          </Link>
          {", "}
          <Link href="/privacy" className="auth-legal-consent__link">
            {t("login.privacy_link")}
          </Link>
          {", "}
          <Link href="/disclaimer" className="auth-legal-consent__link">
            {t("login.disclaimer_link")}
          </Link>
          {". "}
          {t("login.legal_age_guardian")}
        </span>
      </label>
    </div>
  );
}
