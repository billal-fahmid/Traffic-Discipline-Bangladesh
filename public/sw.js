// Minimal service worker for Web Push notifications. Registered by
// src/components/dashboard/push-toggle.tsx. This is intentionally
// small — it just displays whatever the push payload contains and
// focuses/opens the app on click. No caching/offline logic here.

self.addEventListener("push", (event) => {
  let payload = { title: "Traffic Discipline Bangladesh", body: "You have an update.", url: "/dashboard" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Non-JSON payload — fall back to defaults above.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/favicon.ico",
      data: { url: payload.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(clients.openWindow(url));
});
