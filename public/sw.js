// Service Worker for Viewza PWA + Push Notifications

// Cache name
const CACHE_NAME = "viewza-v1";

// Install event
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  const defaultData = {
    title: "Viewza",
    body: "You have a new notification",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "viewza-notification",
  };

  let data = defaultData;
  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...defaultData, ...parsed };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/favicon.ico",
    badge: data.badge || "/favicon.ico",
    tag: data.tag || `viewza-${Date.now()}`,
    renotify: true,
    data: {
      url: data.url || "/notifications",
      type: data.type,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click - open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});
