"use client";

import { Snowflake } from "lucide-react";
import { GemIcon } from "@/components/GemIcon";
import { formatNumber } from "@/lib/i18n/format";
import { useLang } from "@/lib/lang-context";

type BalanceChipProps = {
  gems: number;
  /** Null keeps the freezie slot the same width while the balance is unknown. */
  freezies: number | null;
  animate?: boolean;
};

/** Gem and freezie counts in one compact header pill. */
export function BalanceChip({ gems, freezies, animate = false }: BalanceChipProps) {
  const { lang, t } = useLang();

  return (
    <div className="balance-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-[#0a0612] px-2">
      <GemIcon size={14} sparkle={animate} />
      <span className="min-w-[1.25rem] text-xs font-bold tabular-nums text-purple-300">
        {formatNumber(gems, lang)}
      </span>
      <span className="h-3 w-px shrink-0 bg-white/15" aria-hidden />
      <Snowflake
        className="h-3.5 w-3.5 shrink-0 text-sky-400"
        aria-hidden
        style={animate ? { animation: "spin 3s linear infinite" } : undefined}
      />
      <span
        className="min-w-[1.25rem] text-xs font-bold tabular-nums text-sky-300"
        title={t("freezie.title")}
      >
        {freezies == null ? "–" : formatNumber(freezies, lang)}
      </span>
    </div>
  );
}
