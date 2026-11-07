self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    return;
  }
  if (!data) return;
  event.waitUntil(
    (async () => {
      let sound = true;
      try {
        const preference = await (
          await caches.open("llama-device-preferences-v1")
        ).match("/__llama_notification_sound");
        if (preference) sound = (await preference.json()).enabled !== false;
      } catch {
        /* Storage failure must not suppress a household alert. */
      }
      try {
        const pages = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        const visible = pages.find(page => page.visibilityState === "visible");
        if (sound && visible) visible.postMessage({ type: "llama-household-alert" });
      } catch { /* In-app audio must never prevent system notifications. */ }
      return self.registration.showNotification("LLAMA household", {
        body: data.body || "Open LLAMA to view your household update.",
        icon: "/llama-logo.png",
        tag: "llama-household",
        renotify: true,
        silent: !sound,
        data: { url: "/" },
      });
    })(),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.navigate("/");
        return existing.focus();
      }
      return self.clients.openWindow("/");
    })(),
  );
});
