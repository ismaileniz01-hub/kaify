"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

type CrashCopy = {
  lang: "tr" | "en";
  title: string;
  body: string;
  retry: string;
};

const COPY: Record<"tr" | "en", Omit<CrashCopy, "lang">> = {
  en: {
    title: "Something went wrong",
    body: "The error was reported to our team. Please try again.",
    retry: "Try again",
  },
  tr: {
    title: "Bir şeyler ters gitti",
    body: "Hata ekibimize iletildi. Lütfen tekrar deneyin.",
    retry: "Yeniden dene",
  },
};

function resolveCrashLang(): "tr" | "en" {
  if (typeof document === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem("kaify-lang");
    if (stored === "tr" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  const cookie = document.cookie.match(/(?:^|;\s*)kaify-lang=([^;]+)/)?.[1];
  if (cookie === "tr" || cookie === "en") return cookie;
  const htmlLang = document.documentElement.lang?.toLowerCase() ?? "";
  if (htmlLang.startsWith("tr")) return "tr";
  return "en";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copy, setCopy] = useState<CrashCopy>({ lang: "en", ...COPY.en });

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  useEffect(() => {
    const lang = resolveCrashLang();
    setCopy({ lang, ...COPY[lang] });
  }, []);

  return (
    <html lang={copy.lang}>
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <h1 className="text-lg font-semibold">{copy.title}</h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-400">{copy.body}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white"
        >
          {copy.retry}
        </button>
      </body>
    </html>
  );
}
