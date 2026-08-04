"use client";

/**
 * Renders server-provided daily quote (from home.service).
 * Avoids pulling the multi-locale quote catalog into the client bundle.
 */
export function DailyMotivationQuote({
  serverQuote,
  fallback,
}: {
  serverQuote?: string | null;
  fallback: string;
}) {
  return <>{serverQuote?.trim() || fallback}</>;
}
