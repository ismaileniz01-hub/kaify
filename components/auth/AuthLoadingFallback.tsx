"use client";

import { useEffect, useState } from "react";

type AuthLoadingFallbackProps = {
  destination: "login" | "signup";
};

const RECOVERY_MS = 8_000;

export function AuthLoadingFallback({
  destination,
}: AuthLoadingFallbackProps) {
  const [timedOut, setTimedOut] = useState(false);
  const label = destination === "login" ? "sign-in" : "account creation";
  const href = `/${destination}`;

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), RECOVERY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className="landing-site flex min-h-dvh items-center justify-center bg-black px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex max-w-sm flex-col items-center gap-4">
        {!timedOut && (
          <div
            className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-purple-400"
            aria-hidden
          />
        )}
        <p className="text-sm text-zinc-300">
          {timedOut
            ? `Secure ${label} is taking longer than expected.`
            : `Loading secure ${label}…`}
        </p>
        <p className="text-xs leading-5 text-zinc-500">
          {timedOut
            ? "Reload this page. If it still does not appear, try another browser or the installed app."
            : "This page should appear in a few seconds."}{" "}
          <a
            className="font-semibold text-purple-300 underline underline-offset-4"
            href={href}
          >
            Reload this page
          </a>
          .
        </p>
        <noscript>
          <p className="text-xs leading-5 text-zinc-400">
            JavaScript is required to sign in. Enable it, then
            {" "}
            <a className="font-semibold text-purple-300 underline" href={href}>
              open {label}
            </a>
            .
          </p>
        </noscript>
      </div>
    </div>
  );
}
