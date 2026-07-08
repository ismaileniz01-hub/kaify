"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";

const LINKS = [
  { href: "#about", labelKey: "landing.nav.about", en: "About" },
  { href: "#coaches", labelKey: "landing.nav.coaches", en: "Coaches" },
  { href: "#features", labelKey: "landing.nav.features", en: "Features" },
  { href: "#streak", labelKey: "landing.nav.streak", en: "Streak" },
  { href: "#kai", labelKey: "landing.nav.kai", en: "Dragon Kai" },
] as const;

const EN = {
  about: "About",
  coaches: "Coaches",
  features: "Features",
  pricing: "Pricing",
  login: "Login",
  explore: "Explore Plans",
} as const;

export function LandingNav({
  pricingPage = false,
  forceEnglish = false,
}: {
  pricingPage?: boolean;
  forceEnglish?: boolean;
}) {
  const { t } = useLang();
  const label = (key: string, english: string) => (forceEnglish ? english : t(key));
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const homePrefix = pricingPage ? "/" : "";

  return (
    <header className={`landing-nav ${scrolled ? "landing-nav--scrolled" : ""}`}>
      <div className="landing-container flex items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/kaify-logo.png"
            alt="K.AIFY"
            width={48}
            height={48}
            className="h-11 w-11 rounded-xl object-cover shadow-[0_0_24px_rgba(168,85,247,0.35)]"
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {pricingPage ? (
            <>
              <Link
                href="/#about"
                className="text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white"
              >
                {label("landing.nav.about", EN.about)}
              </Link>
              <Link
                href="/#coaches"
                className="text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white"
              >
                {label("landing.nav.coaches", EN.coaches)}
              </Link>
              <Link
                href="/#features"
                className="text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white"
              >
                {label("landing.nav.features", EN.features)}
              </Link>
            </>
          ) : (
            LINKS.map((link) => (
              <a
                key={link.href}
                href={`${homePrefix}${link.href}`}
                className="text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-purple-400 focus-visible:outline-offset-4 rounded-sm"
              >
                {label(link.labelKey, link.en)}
              </a>
            ))
          )}
          <Link
            href="/pricing"
            className={`text-sm font-medium transition-colors duration-300 hover:text-white ${
              pricingPage ? "text-purple-300" : "text-zinc-400"
            }`}
          >
            {label("landing.nav.pricing", EN.pricing)}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-zinc-400 transition hover:text-white sm:inline"
          >
            {label("landing.nav.login", EN.login)}
          </Link>
          <Link
            href="/pricing"
            className="landing-btn landing-btn--primary shrink-0 text-sm active:scale-[0.97]"
          >
            {label("landing.pricing.explore_plans", EN.explore)}
          </Link>
        </div>
      </div>
    </header>
  );
}
