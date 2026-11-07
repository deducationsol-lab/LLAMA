const CACHE = "llama-device-preferences-v1";
const KEY = "/__llama_notification_sound";
export async function getNotificationSound() {
  if (!("caches" in window)) return true;
  const value = await (await caches.open(CACHE)).match(KEY);
  return value ? (await value.json()).enabled !== false : true;
}
export async function setNotificationSound(enabled) {
  if (!("caches" in window))
    throw new Error("This browser cannot save notification preferences.");
  await (
    await caches.open(CACHE)
  ).put(
    KEY,
    new Response(JSON.stringify({ enabled: !!enabled }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}
export async function testDeviceNotification() {
  if (!("Notification" in window) || Notification.permission !== "granted")
    throw new Error("Enable notifications on this device first.");
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration)
    throw new Error("Enable notifications on this device first.");
  await registration.showNotification("LLAMA notification test", {
    body: "This is a test on this device only. Your phone controls the alert sound.",
    icon: "/llama-logo.png",
    tag: "llama-test",
    renotify: true,
    silent: !(await getNotificationSound()),
    data: { url: "/" },
  });
}

let alertAudio;
// Must be called directly from a user's click; browsers gate custom audio.
export async function previewLlamaSound() {
  alertAudio ||= new Audio('/sounds/llama-alert.mp3');
  alertAudio.currentTime = 0;
  await alertAudio.play();
}
export function listenForHouseholdSound() {
  if (!('serviceWorker' in navigator)) return () => {};
  const listener = async event => {
    if (event.data?.type !== 'llama-household-alert' || document.visibilityState !== 'visible') return;
    if (!(await getNotificationSound())) return;
    // No autoplay workaround: if this page has not been unlocked by a click,
    // let the normal OS notification remain the fallback.
    if (alertAudio) {
      try { await previewLlamaSound(); } catch { /* Browser blocked playback. */ }
    }
  };
  navigator.serviceWorker.addEventListener('message', listener);
  return () => navigator.serviceWorker.removeEventListener('message', listener);
}
