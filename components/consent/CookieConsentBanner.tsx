"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang-context";
import {
  hasCookieConsentChoice,
  writeCookieConsent,
} from "@/lib/legal/cookie-consent";
import { COOKIES_PATH, TERMS_PATH } from "@/lib/legal/constants";

const LEGAL_ONLY_PREFIXES = ["/privacy", "/terms", "/terms&conditions", "/cookies"];

/**
 * Site-wide cookie banner (accept / reject non-essential cookies).
 * Portaled to document.body so landing layout cannot hide it.
 */
export function CookieConsentBanner() {
  const { t } = useLang();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (LEGAL_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
      setVisible(false);
      document.documentElement.removeAttribute("data-cookie-banner");
      return;
    }
    const show = !hasCookieConsentChoice();
    setVisible(show);
    if (show) {
      document.documentElement.setAttribute("data-cookie-banner", "open");
    } else {
      document.documentElement.removeAttribute("data-cookie-banner");
    }
  }, [pathname]);

  const choose = (choice: "accepted" | "rejected") => {
    writeCookieConsent(choice);
    setVisible(false);
    document.documentElement.removeAttribute("data-cookie-banner");
  };

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[9999] border-t border-white/10 bg-zinc-950/98 p-4 shadow-[0_-8px_40px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-5"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p id="cookie-banner-title" className="text-sm font-semibold text-white">
            {t("cookies.banner.title")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            {t("cookies.banner.short")}{" "}
            {t("cookies.banner.legal_prefix")}{" "}
            <Link
              href={TERMS_PATH}
              className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
            >
              {t("cookies.banner.terms_link")}
            </Link>{" "}
            {t("cookies.banner.legal_and")}{" "}
            <Link
              href={COOKIES_PATH}
              className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
            >
              {t("cookies.banner.cookies_link")}
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="rounded-full border border-white/15 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/5"
          >
            {t("cookies.banner.reject")}
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            {t("cookies.banner.accept")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
