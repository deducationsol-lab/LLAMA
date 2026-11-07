export async function familyRequest(input) {
  const response = await fetch(
    "/api/family",
    input
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      : { cache: "no-store" },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      result.error || "Household service did not respond. Try again.",
    );
  return result;
}
export async function disableDevicePush() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager?.getSubscription();
  if (subscription) {
    await familyRequest({
      action: "unsubscribe",
      endpoint: subscription.endpoint,
    });
    await subscription.unsubscribe();
  }
}
export async function enableDevicePush(publicKey) {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  )
    throw new Error(
      "Push is not supported here. On iPhone/iPad, install LLAMA to the Home Screen first and open it there.",
    );
  if ((await Notification.requestPermission()) !== "granted")
    throw new Error(
      "Notifications are blocked. Allow them in this browser's site permissions to opt in.",
    );
  const registration = await navigator.serviceWorker.register("/family-sw.js");
  await navigator.serviceWorker.ready;
  const key = Uint8Array.from(
    atob(
      publicKey.replace(/-/g, "+").replace(/_/g, "/") +
        "=".repeat((4 - (publicKey.length % 4)) % 4),
    ),
    (c) => c.charCodeAt(0),
  );
  const previous = await registration.pushManager.getSubscription();
  const subscription =
    previous ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    }));
  try {
    await familyRequest({
      action: "subscribe",
      subscription: subscription.toJSON(),
    });
  } catch (error) {
    if (!previous) await subscription.unsubscribe();
    throw error;
  }
}
export async function devicePushEnabled() {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager?.getSubscription())?.endpoint || null;
}
export function clearAccountStorage(userId) {
  for (const key of Object.keys(localStorage)) {
    if (
      key.startsWith(`llama_${userId}_`) ||
      key === `llama_members_${userId}` ||
      key === `household_${userId}`
    )
      localStorage.removeItem(key);
  }
}
