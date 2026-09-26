"use client";

import { ANALYTICS_UPDATED_EVENT } from "@/lib/analytics-client-cache";
import { dispatchOfflineRetry } from "@/lib/offline-retry";
import { hapticNotification } from "@/lib/native/haptics";
import { InlineAlert } from "@/components/InlineAlert";
import { useLang } from "@/lib/lang-context";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/** Fixed banner when the device reports offline — retry refetches, never reloads. */
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
          if (typeof window === "undefined") return;
          void hapticNotification("warning");
          window.dispatchEvent(new Event(ANALYTICS_UPDATED_EVENT));
          dispatchOfflineRetry();
        }}
        retryLabel={t("offline.retry")}
        dismissLabel={t("common.dismiss")}
      />
    </div>
  );
}
