"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/lang-context";

type AppHeaderProps = {
  title?: ReactNode;
  backHref?: string;
  backLabel?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  divider?: boolean;
};

export function AppHeader({
  title,
  backHref,
  backLabel,
  leading,
  trailing,
  className = "",
  divider = false,
}: AppHeaderProps) {
  const { t } = useLang();
  const resolvedBackLabel = backLabel ?? t("nav.back");

  const leadingContent =
    leading ??
    (backHref ? (
      <Link
        href={backHref}
        prefetch
        className="app-header__action"
        aria-label={resolvedBackLabel}
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
    ) : (
      <span className="app-header__spacer" aria-hidden />
    ));

  return (
    <header className={`app-header animate-in animate-in--1 ${className}`.trim()}>
      <div className="app-header__side app-header__side--leading">{leadingContent}</div>
      <div className="app-header__title">{title}</div>
      <div className="app-header__side app-header__side--trailing">
        {trailing ?? <span className="app-header__spacer" aria-hidden />}
      </div>
      {divider && <span className="app-header__divider" aria-hidden />}
    </header>
  );
}
