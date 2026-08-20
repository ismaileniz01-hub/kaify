"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { hasBrowserAuthCookie } from "@/lib/auth/browser-auth-hint";
import { hasActiveSubscription } from "@/lib/auth/post-auth-redirect";
import { useLang } from "@/lib/lang-context";
import { useSessionOptional } from "@/lib/session-contexts";

const LINKS = [
  { href: "#about", labelKey: "landing.nav.about" },
  { href: "#coaches", labelKey: "landing.nav.coaches" },
  { href: "#features", labelKey: "landing.nav.features" },
  { href: "#streak", labelKey: "landing.nav.streak" },
  { href: "#kai", labelKey: "landing.nav.kai" },
  { href: "#faq", labelKey: "landing.nav.faq" },
] as const;

export function LandingNav({
  pricingPage = false,
  accountPage = false,
}: {
  pricingPage?: boolean;
  accountPage?: boolean;
}) {
  const { t } = useLang();
  const session = useSessionOptional();
  const cookieAuthed = hasBrowserAuthCookie();
  const isAuthenticated = session?.isAuthenticated ?? cookieAuthed;
  const isLoading = session?.isLoading ?? false;
  const displayName = session?.displayName ?? "";
  const profile = session?.profile ?? null;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const homePrefix = pricingPage ? "/" : "";
  const appHref =
    isAuthenticated && hasActiveSubscription(profile?.tier) ? "/welcome" : "/pricing";

  const primaryCtaHref = isLoading
    ? "#"
    : isAuthenticated
      ? accountPage
        ? appHref
        : "/myaccount"
      : "/signup";

  const primaryCtaLabel = isLoading
    ? "…"
    : isAuthenticated
      ? accountPage
        ? t("myaccount.open_app")
        : t("landing.nav.my_account")
      : t("landing.nav.signup");

  return (
    <header className={`landing-nav ${scrolled ? "landing-nav--scrolled" : ""}`}>
      <div className="landing-container flex items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Kaify Ai">
          <Image
            src="/kaify-logo.png"
            alt="Kaify Ai"
            width={48}
            height={48}
            className="h-11 w-11 rounded-xl object-cover shadow-[0_0_24px_rgba(168,85,247,0.35)]"
          />
        </Link>

        <nav className="hidden items-center gap-4 xl:gap-7 lg:flex">
          {pricingPage ? (
            <>
              <Link
                href="/#about"
                className="text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white"
              >
                {t("landing.nav.about")}
              </Link>
              <Link
                href="/#coaches"
                className="text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white"
              >
                {t("landing.nav.coaches")}
              </Link>
              <Link
                href="/#features"
                className="text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white"
              >
                {t("landing.nav.features")}
              </Link>
              <Link
                href="/#faq"
                className="text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white"
              >
                {t("landing.nav.faq")}
              </Link>
            </>
          ) : (
            LINKS.map((link) => (
              <a
                key={link.href}
                href={`${homePrefix}${link.href}`}
                className="text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-purple-400 focus-visible:outline-offset-4 rounded-sm"
              >
                {t(link.labelKey)}
              </a>
            ))
          )}
          <Link
            href="/pricing"
            className={`text-sm font-medium transition-colors duration-300 hover:text-white ${
              pricingPage ? "text-purple-300" : "text-zinc-400"
            }`}
          >
            {t("landing.nav.pricing")}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {!isLoading && isAuthenticated && !accountPage ? (
            <Link
              href="/myaccount"
              className="hidden text-sm font-medium text-zinc-300 transition hover:text-white sm:inline"
            >
              {displayName || t("landing.nav.my_account")}
            </Link>
          ) : !isLoading && !isAuthenticated ? (
            <Link
              href="/login?mode=signin"
              className="hidden text-sm font-medium text-zinc-400 transition hover:text-white sm:inline"
            >
              {t("landing.nav.login")}
            </Link>
          ) : null}
          <Link
            href={primaryCtaHref}
            aria-disabled={isLoading}
            className={`landing-btn landing-btn--primary shrink-0 text-sm active:scale-[0.97] ${
              isLoading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {primaryCtaLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
