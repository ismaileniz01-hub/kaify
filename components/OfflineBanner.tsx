"use client";

import { InlineAlert } from "@/components/InlineAlert";
import { useLang } from "@/lib/lang-context";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/** Fixed banner when the device reports offline — retry reloads the page. */
export function OfflineBanner() {
  const { t } = useLang();
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="offline-banner fixed left-0 right-0 top-0 z-[91] px-4 pt-3">
      <InlineAlert
        variant="info"
        message={t("offline.banner")}
        onRetry={() => {
          if (typeof window !== "undefined") window.location.reload();
        }}
        retryLabel={t("offline.retry")}
        dismissLabel={t("common.dismiss")}
      />
    </div>
  );
}
