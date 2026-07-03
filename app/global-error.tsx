"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <h1 className="text-lg font-semibold">Bir şeyler ters gitti</h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-400">
          Hata ekibimize iletildi. Lütfen tekrar deneyin.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Yeniden dene
        </button>
      </body>
    </html>
  );
}
