"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";

export function NotFoundView() {
  const { t } = useLang();

  return (
    <div className="phone-shell flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        404
      </p>
      <h1 className="mt-2 text-lg font-semibold text-white">
        {t("error.not_found.title")}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">
        {t("error.not_found.subtitle")}
      </p>
      <Link
        href="/welcome"
        className="mt-6 rounded-full bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-400"
      >
        {t("error.not_found.home")}
      </Link>
    </div>
  );
}
