/** Dispatched by OfflineBanner; list screens refetch without a full reload. */
export const OFFLINE_RETRY_EVENT = "kaify:offline-retry";

export function dispatchOfflineRetry(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OFFLINE_RETRY_EVENT));
}
