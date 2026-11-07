self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    return;
  }
  if (!data) return;
  event.waitUntil(
    self.registration.showNotification("LLAMA household", {
      body: data.body || "Open LLAMA to view your household update.",
      icon: "/llama-logo.png",
      tag: "llama-household",
      data: { url: "/" },
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
