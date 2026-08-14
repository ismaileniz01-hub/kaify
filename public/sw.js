/* Kaify Ai service worker — Web Push notifications. */

/* Keep in sync with lib/security/safe-notification-url.ts */
var SAFE_NOTIFICATION_FALLBACK = "/welcome";

function resolveSafeNotificationUrl(candidate) {
  if (candidate == null) return SAFE_NOTIFICATION_FALLBACK;
  if (typeof candidate !== "string") return SAFE_NOTIFICATION_FALLBACK;

  var trimmed = candidate.trim();
  if (!trimmed) return SAFE_NOTIFICATION_FALLBACK;

  var lower = trimmed.toLowerCase();
  if (
    lower.indexOf("javascript:") === 0 ||
    lower.indexOf("data:") === 0 ||
    lower.indexOf("vbscript:") === 0 ||
    lower.indexOf("blob:") === 0
  ) {
    return SAFE_NOTIFICATION_FALLBACK;
  }

  try {
    var base = self.location.origin + "/";
    var resolved = trimmed.indexOf("/") === 0
      ? new URL(trimmed, base)
      : new URL(trimmed, base);

    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return SAFE_NOTIFICATION_FALLBACK;
    }

    if (resolved.origin !== self.location.origin) {
      return SAFE_NOTIFICATION_FALLBACK;
    }

    return (resolved.pathname + resolved.search + resolved.hash) || SAFE_NOTIFICATION_FALLBACK;
  } catch (e) {
    return SAFE_NOTIFICATION_FALLBACK;
  }
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Kaify Ai", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Kaify Ai";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/kai-mascot-v2.png",
    badge: payload.badge || "/icons/badge-72.png",
    image: payload.image || undefined,
    tag: payload.tag || undefined,
    renotify: payload.tag ? true : undefined,
    data: { url: resolveSafeNotificationUrl(payload.url || "/welcome") },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw =
    (event.notification.data && event.notification.data.url) || "/welcome";
  const targetUrl = resolveSafeNotificationUrl(raw);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
