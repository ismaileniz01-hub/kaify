"use client";

import { useEffect } from "react";
import { OFFLINE_RETRY_EVENT } from "@/lib/offline-retry";

/** Re-run `onRetry` when the offline banner retry control fires. */
export function useOfflineRetry(onRetry: () => void): void {
  useEffect(() => {
    const handler = () => onRetry();
    window.addEventListener(OFFLINE_RETRY_EVENT, handler);
    return () => window.removeEventListener(OFFLINE_RETRY_EVENT, handler);
  }, [onRetry]);
}
