"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang-context";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLang();

  useEffect(() => {
    console.error("[app] unhandled error:", error);
  }, [error]);

  return (
    <div className="phone-shell flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-lg font-semibold text-white">{t("error.boundary.title")}</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">{t("error.boundary.subtitle")}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-400"
        >
          {t("error.boundary.retry")}
        </button>
        <Link
          href="/welcome"
          className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
        >
          {t("error.boundary.home")}
        </Link>
      </div>
    </div>
  );
}
