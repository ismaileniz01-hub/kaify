"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLang } from "@/lib/lang-context";

type LegalPageShellProps = {
  title: string;
  titleKey?: string;
  subtitle?: string;
  children: ReactNode;
};

export function LegalPageShell({
  title,
  titleKey,
  subtitle,
  children,
}: LegalPageShellProps) {
  const { t } = useLang();
  const resolvedTitle = titleKey ? t(titleKey) : title;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/10 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Kaify
          </Link>
          <div className="flex gap-4 text-xs text-zinc-500">
            <Link href="/terms" className="hover:text-zinc-300">
              {t("legal.terms")}
            </Link>
            <Link href="/privacy" className="hover:text-zinc-300">
              {t("legal.privacy")}
            </Link>
            <Link href="/cookies" className="hover:text-zinc-300">
              {t("legal.cookies")}
            </Link>
            <Link href="/kvkk" className="hover:text-zinc-300">
              KVKK
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight">{resolvedTitle}</h1>
        {subtitle && <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
