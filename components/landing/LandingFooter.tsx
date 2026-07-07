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
            alt="K.AIFY"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="text-sm font-semibold tracking-[0.1em] text-zinc-400">
            K.AIFY © 2026
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
          <a href="/#about" className="transition hover:text-white">
            {t("landing.nav.about")}
          </a>
          <a href="/#coaches" className="transition hover:text-white">
            {t("landing.nav.coaches")}
          </a>
          <a href="/#features" className="transition hover:text-white">
            {t("landing.nav.features")}
          </a>
          <Link href="/pricing" className="transition hover:text-white">
            {t("landing.nav.pricing")}
          </Link>
          <Link href="/privacy" className="transition hover:text-white">
            Privacy
          </Link>
          <Link href="/terms&conditions" className="transition hover:text-white">
            Terms & Conditions
          </Link>
          <Link href="/cookies" className="transition hover:text-white">
            Cookies
          </Link>
        </nav>

        <p className="text-xs text-zinc-600">Fitness · Coaching · Made enjoyable</p>
      </div>
    </footer>
  );
}
