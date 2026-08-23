"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { hasBrowserAuthCookie } from "@/lib/auth/browser-auth-hint";
import { hasPaidPlan } from "@/lib/auth/post-auth-redirect";
import { useLang } from "@/lib/lang-context";
import { useSessionOptional } from "@/lib/session-contexts";
import { LandingAccountMenu, useAccountSnapshot } from "./LandingAccountMenu";
import { LandingLangSelect } from "./LandingLangSelect";

const LINKS = [
  { href: "#about", labelKey: "landing.nav.about" },
  { href: "#coaches", labelKey: "landing.nav.coaches" },
  { href: "#features", labelKey: "landing.nav.features" },
  { href: "#streak", labelKey: "landing.nav.streak" },
  { href: "#faq", labelKey: "landing.nav.faq" },
] as const;

export function LandingNav({
  pricingPage = false,
}: {
  pricingPage?: boolean;
  accountPage?: boolean;
}) {
  const { t } = useLang();
  const session = useSessionOptional();
  const cookieAuthed = hasBrowserAuthCookie();
  const isAuthenticated = session?.isAuthenticated ?? cookieAuthed;
  const isLoading = session?.isLoading ?? false;
  const snapshot = useAccountSnapshot(isAuthenticated);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const homePrefix = pricingPage ? "/" : "";
  const appHref =
    isAuthenticated && hasPaidPlan(snapshot) ? "/welcome" : "/pricing";

  const primaryCtaHref = isLoading
    ? "#"
    : isAuthenticated
      ? appHref
      : "/signup";

  const primaryCtaLabel = isLoading
    ? "…"
    : isAuthenticated
      ? t("landing.nav.go_to_app")
      : t("landing.nav.signup");

  const navLinks = pricingPage
    ? [
        { href: "/#about", label: t("landing.nav.about") },
        { href: "/#coaches", label: t("landing.nav.coaches") },
        { href: "/#features", label: t("landing.nav.features") },
        { href: "/#faq", label: t("landing.nav.faq") },
        { href: "/pricing", label: t("landing.nav.pricing") },
      ]
    : [
        ...LINKS.map((link) => ({
          href: `${homePrefix}${link.href}`,
          label: t(link.labelKey),
        })),
        { href: "/pricing", label: t("landing.nav.pricing") },
      ];

  return (
    <header className={`landing-nav ${scrolled || menuOpen ? "landing-nav--scrolled" : ""}`}>
      <div className="landing-container flex items-center justify-between gap-3">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Kaify Ai">
          <Image
            src="/kaify-logo.png"
            alt="Kaify Ai"
            width={48}
            height={48}
            className="h-10 w-10 rounded-xl object-cover shadow-[0_0_24px_rgba(168,85,247,0.35)] sm:h-11 sm:w-11"
          />
        </Link>

        <nav className="hidden items-center gap-4 xl:gap-7 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors duration-300 hover:text-white ${
                pricingPage && link.href === "/pricing" ? "text-purple-300" : "text-zinc-400"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <LandingLangSelect className="hidden lg:block" />
          {!isLoading && isAuthenticated ? (
            <LandingAccountMenu snapshot={snapshot} />
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
            className={`landing-btn landing-btn--primary landing-nav-cta shrink-0 text-sm active:scale-[0.97] ${
              isLoading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {primaryCtaLabel}
          </Link>
          <button
            type="button"
            className="landing-menu-toggle lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={menuOpen ? t("landing.nav.close") : t("landing.nav.menu")}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div id="landing-mobile-menu" className="landing-mobile-menu lg:hidden">
          <nav className="landing-container flex flex-col gap-1 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="landing-mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!isAuthenticated ? (
              <Link
                href="/login?mode=signin"
                className="landing-mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                {t("landing.nav.login")}
              </Link>
            ) : null}
            <div className="mt-3 border-t border-white/10 px-1 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {t("landing.nav.language")}
              </p>
              <LandingLangSelect />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
