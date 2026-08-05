"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useLang } from "@/lib/lang-context";

type InlineAlertProps = {
  variant?: "error" | "success" | "info";
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  dismissLabel?: string;
  className?: string;
};

export function InlineAlert({
  variant = "error",
  message,
  onDismiss,
  onRetry,
  retryLabel,
  dismissLabel,
  className = "",
}: InlineAlertProps) {
  const { t } = useLang();
  const resolvedRetry = retryLabel ?? t("common.retry");
  const resolvedDismiss = dismissLabel ?? t("common.dismiss");
  const styles =
    variant === "success"
      ? "border-emerald-400/25 bg-gradient-to-r from-emerald-500/12 to-emerald-950/20 text-emerald-200"
      : variant === "info"
        ? "border-blue-400/25 bg-gradient-to-r from-blue-500/12 to-blue-950/20 text-blue-200"
        : "border-red-400/25 bg-gradient-to-r from-red-500/12 to-red-950/20 text-red-200";

  const Icon =
    variant === "success" ? CheckCircle2 : variant === "info" ? Info : AlertCircle;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`premium-inline-alert flex items-start gap-2.5 border px-3.5 py-3 text-xs ${styles} ${className}`}
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-current/10">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <p className="type-body flex-1 text-current">{message}</p>
      <div className="flex shrink-0 items-center gap-1">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="touch-44 rounded-lg px-2 py-1 font-semibold underline-offset-2 hover:underline"
          >
            {resolvedRetry}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="touch-44 flex items-center justify-center rounded-lg p-1 opacity-70 hover:bg-white/5 hover:opacity-100"
            aria-label={resolvedDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
