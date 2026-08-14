"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/lang-context";

export function LandingFooter() {
  const { t } = useLang();

  return (
    <footer className="landing-footer">
      <div className="landing-container flex flex-col items-center justify-between gap-6 py-12 md:flex-row">
        <div className="flex items-center gap-3">
          <Image
            src="/kaify-logo.png"
            alt="Kaify Ai"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="text-sm font-semibold tracking-[0.1em] text-zinc-400">
            Kaify Ai © 2026
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
          <Link href="/#about" className="transition hover:text-white">
            {t("landing.nav.about")}
          </Link>
          <Link href="/#coaches" className="transition hover:text-white">
            {t("landing.nav.coaches")}
          </Link>
          <Link href="/#features" className="transition hover:text-white">
            {t("landing.nav.features")}
          </Link>
          <Link href="/pricing" className="transition hover:text-white">
            {t("landing.nav.pricing")}
          </Link>
          <Link href="/privacy" className="transition hover:text-white">
            {t("legal.privacy")}
          </Link>
          <Link href="/terms" className="transition hover:text-white">
            {t("legal.terms")}
          </Link>
          <Link href="/cookies" className="transition hover:text-white">
            {t("legal.cookies")}
          </Link>
          <Link href="/kvkk" className="transition hover:text-white">
            {t("legal.kvkk")}
          </Link>
        </nav>

        <p className="text-xs text-zinc-600">{t("landing.hero.eyebrow")}</p>
      </div>
    </footer>
  );
}
