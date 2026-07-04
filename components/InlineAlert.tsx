"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";

type InlineAlertProps = {
  variant?: "error" | "success" | "info";
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function InlineAlert({
  variant = "error",
  message,
  onDismiss,
  onRetry,
  retryLabel = "Retry",
  className = "",
}: InlineAlertProps) {
  const styles =
    variant === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : variant === "info"
        ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
        : "border-red-500/30 bg-red-500/10 text-red-200";

  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${styles} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 leading-relaxed">{message}</p>
      <div className="flex shrink-0 items-center gap-1">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg px-2 py-1 font-medium underline-offset-2 hover:underline"
          >
            {retryLabel}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
