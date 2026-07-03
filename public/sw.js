/* K.AIFY service worker — Web Push notifications. */

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
    payload = { title: "K.AIFY", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "K.AIFY";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/kai-mascot-v2.png",
    badge: payload.badge || "/icons/badge-72.png",
    image: payload.image || undefined,
    tag: payload.tag || undefined,
    renotify: payload.tag ? true : undefined,
    data: { url: payload.url || "/welcome" },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/welcome";

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
