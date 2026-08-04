/**
 * Open a URL in the system browser (native) or a new tab (web).
 * Used for ADR 019 web billing (Paddle must not run inside the Capacitor WebView).
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url });
        return;
      } catch {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    }
  } catch {
    // Fall through.
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
