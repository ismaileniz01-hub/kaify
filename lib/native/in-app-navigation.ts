import { isAppHostname } from "@/lib/app-url";
import { navigateAppUrl } from "@/lib/native/deep-links";

/**
 * Keep navigation inside the Capacitor WebView (no Safari/Chrome hand-off).
 */
export function bindInAppNavigation(): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const anchor = (event.target as Element | null)?.closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;

    let url: URL;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }

    if (!isAppHostname(url.hostname)) return;

    if (url.origin !== window.location.origin) {
      event.preventDefault();
      navigateAppUrl(url.pathname + url.search + url.hash);
      return;
    }

    if (anchor.target === "_blank") {
      event.preventDefault();
      navigateAppUrl(url.pathname + url.search + url.hash);
    }
  };

  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
