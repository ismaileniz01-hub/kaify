import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  tone?: "neutral" | "info" | "success";
  compact?: boolean;
};

/** Shared empty-list placeholder for inbox-style screens. */
export function EmptyState({
  title,
  subtitle,
  icon,
  action,
  className = "",
  tone = "neutral",
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`premium-empty-state flex flex-col items-center justify-center text-center ${
        compact ? "gap-2 px-5 py-7" : "gap-3 px-6 py-10"
      } ${className}`}
      data-tone={tone}
      role="status"
    >
      <div className="premium-empty-state__icon mb-1">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </div>
      <p className="type-title text-zinc-100">{title}</p>
      {subtitle ? (
        <p className="type-body max-w-[280px] text-zinc-400">
          {subtitle}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
