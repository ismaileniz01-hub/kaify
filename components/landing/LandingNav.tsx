"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLang, LANG_OPTIONS } from "@/lib/lang-context";

const LINKS = [
  { href: "#about", labelKey: "landing.nav.about" },
  { href: "#coaches", labelKey: "landing.nav.coaches" },
  { href: "#features", labelKey: "landing.nav.features" },
  { href: "#streak", labelKey: "landing.nav.streak" },
  { href: "#kai", labelKey: "landing.nav.kai" },
] as const;

export function LandingNav() {
  const { t, lang, setLang } = useLang();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`landing-nav ${scrolled ? "landing-nav--scrolled" : ""}`}>
      <div className="landing-container flex items-center justify-between gap-4">
        <a href="#" className="flex shrink-0 items-center">
          <Image
            src="/kaify-logo.png"
            alt="K.AIFY"
            width={48}
            height={48}
            className="h-11 w-11 rounded-xl object-cover shadow-[0_0_24px_rgba(168,85,247,0.35)]"
          />
        </a>

        <nav className="hidden items-center gap-7 lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-purple-400 focus-visible:outline-offset-4 rounded-sm"
            >
              {t(link.labelKey)}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <label className="sr-only" htmlFor="landing-lang">
            {t("landing.nav.language")}
          </label>
          <select
            id="landing-lang"
            value={lang}
            onChange={(e) => setLang(e.target.value as typeof lang)}
            className="rounded-lg border border-white/10 bg-zinc-900/80 px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-purple-500/50"
          >
            {LANG_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
          <a
            href="/login"
            className="hidden text-sm font-medium text-zinc-400 transition hover:text-white sm:inline"
          >
            {t("landing.nav.login")}
          </a>
          <a
            href="#waitlist"
            className="landing-btn landing-btn--primary shrink-0 text-sm active:scale-[0.97]"
          >
            {t("landing.nav.waitlist")}
          </a>
        </div>
      </div>
    </header>
  );
}
