"use client";

import { InlineAlert } from "@/components/InlineAlert";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";

/** Shown when session bootstrap fails (non-401). */
export function SessionErrorBanner() {
  const { t } = useLang();
  const { sessionError, refreshSession, clearSessionError } = useSession();

  if (!sessionError) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[90] px-4 pt-3">
      <InlineAlert
        message={t("session.error")}
        onRetry={() => void refreshSession()}
        retryLabel={t("session.retry")}
        onDismiss={clearSessionError}
      />
    </div>
  );
}
