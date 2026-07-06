"use client";

import { useMemo } from "react";
import { getDailyMotivationQuoteSync } from "@/lib/motivation-quotes";
import { useLang } from "@/lib/lang-context";

export function DailyMotivationQuote({
  serverQuote,
  fallback,
}: {
  serverQuote?: string | null;
  fallback: string;
}) {
  const { lang } = useLang();
  const clientQuote = useMemo(
    () => getDailyMotivationQuoteSync(lang),
    [lang],
  );

  return <>{serverQuote || clientQuote || fallback}</>;
}
