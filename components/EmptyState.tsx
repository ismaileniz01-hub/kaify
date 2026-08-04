"use client";

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Shared empty-list placeholder for inbox-style screens. */
export function EmptyState({
  title,
  subtitle,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 px-6 py-10 text-center ${className}`}
      role="status"
    >
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-zinc-500">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </div>
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      {subtitle ? (
        <p className="max-w-[260px] text-xs leading-relaxed text-zinc-600">
          {subtitle}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
