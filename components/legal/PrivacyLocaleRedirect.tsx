"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * TR users see the global Privacy Policy (English primary) plus a link to the
 * Turkish KVKK regional module. Do not replace the full policy with KVKK-only text.
 */
export function PrivacyLocaleRedirect() {
  const [showKvkkHint, setShowKvkkHint] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )kaify-lang=([^;]*)/);
    const lang = match?.[1] ? decodeURIComponent(match[1]) : "";
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("kaify-lang")
        : null;
    if (lang === "tr" || stored === "tr") setShowKvkkHint(true);
  }, []);

  if (!showKvkkHint) return null;

  return (
    <p className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-zinc-200">
      Türkçe KVKK özeti için{" "}
      <Link href="/kvkk" className="font-medium text-emerald-300 underline">
        /kvkk
      </Link>{" "}
      sayfasına bakın. Birincil gizlilik metni İngilizcedir (aşağıda).
    </p>
  );
}
