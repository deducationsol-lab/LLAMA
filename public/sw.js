// Notifications only: never cache authenticated pages or household data.
self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data?.json() || {};
  } catch {}
  event.waitUntil(
    self.registration.showNotification("LLAMA household", {
      body:
        message.body === "A household reminder is due. Open LLAMA for details."
          ? message.body
          : "Your household has a new update. Open LLAMA for details.",
      icon: "/apple-touch-icon.png",
      badge: "/favicon.png",
      tag: typeof message.tag === "string" ? message.tag : undefined,
      data: { url: "/#household" },
    }),
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
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.navigate("/#household");
          return client.focus();
        }
      }
      return self.clients.openWindow("/#household");
    })(),
  );
});
