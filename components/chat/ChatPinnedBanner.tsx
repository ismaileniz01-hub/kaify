"use client";

import { ChevronDown, Pin } from "lucide-react";
import type { ReactNode } from "react";

type ChatPinnedBannerProps = {
  label: string;
  title: string;
  metric: string;
  primary: string;
  primaryLight: string;
  ring: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function ChatPinnedBanner({
  label,
  title,
  metric,
  primary,
  primaryLight,
  ring,
  expanded,
  onToggle,
  children,
}: ChatPinnedBannerProps) {
  return (
    <div
      className="shrink-0 border-b bg-[#0a0812]/90 backdrop-blur-xl"
      style={{ borderColor: ring, boxShadow: expanded ? `0 8px 24px ${ring}` : undefined }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={label}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2 text-left"
      >
        <Pin className="h-4 w-4 shrink-0" style={{ color: primaryLight }} aria-hidden />
        {metric ? (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
            style={{
              background: `linear-gradient(135deg, ${primary}, ${primaryLight})`,
              boxShadow: `0 0 12px ${ring}`,
            }}
          >
            {metric}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: primaryLight }}
          >
            {label}
          </p>
          <p className="truncate text-xs font-bold text-white">{title}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="max-h-[min(55vh,28rem)] overflow-y-auto overscroll-contain px-3 pb-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
