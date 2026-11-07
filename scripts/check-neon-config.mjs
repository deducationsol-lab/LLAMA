import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import {
  neonDatabaseUrl,
  pushConfiguration,
  isPushConfigured,
} from "../server/database-config.js";
assert.throws(() => neonDatabaseUrl({ POSTGRES_URL: "not-neon" }), /Neon/);
assert.equal(
  neonDatabaseUrl({ NEON_DATABASE_URL: "test-neon", POSTGRES_URL: "other" }),
  "test-neon",
);
assert.equal(
  neonDatabaseUrl({ NEON_POSTGRES_URL: "fallback-neon" }),
  "fallback-neon",
);
const legacy = {
  WEB_PUSH_PUBLIC_KEY: "public",
  WEB_PUSH_PRIVATE_KEY: "private",
  WEB_PUSH_SUBJECT: "mailto:test@example.test",
  CRON_SECRET: "test-only",
};
assert.equal(isPushConfigured(pushConfiguration(legacy)), true);
assert.equal(
  pushConfiguration({ ...legacy, VAPID_PUBLIC_KEY: "partial" }).publicKey,
  "public",
);
assert.equal(
  pushConfiguration({
    ...legacy,
    VAPID_PUBLIC_KEY: "new-public",
    VAPID_PRIVATE_KEY: "new-private",
    VAPID_SUBJECT: "new-subject",
  }).privateKey,
  "new-private",
);
const source = await readFile(
  new URL("../public/family-sw.js", import.meta.url),
  "utf8",
);
for (const enabled of [true, false, undefined]) {
  const listeners = {};
  const received = [];
  const messages = [];
  const context = {
    self: {
      clients: { matchAll: async () => [{ visibilityState: "visible", postMessage: message => messages.push(message) }] },
      addEventListener: (name, fn) => {
        listeners[name] = fn;
      },
      registration: {
        showNotification: async (title, options) =>
          received.push({ title, options }),
      },
    },
    caches: {
      open: async () => ({
        match: async () =>
          enabled === undefined ? null : { json: async () => ({ enabled }) },
      }),
    },
  };
  vm.runInNewContext(source, context);
  let work;
  listeners.push({
    data: { json: () => ({ body: "Generic household update" }) },
    waitUntil: (promise) => {
      work = promise;
    },
  });
  await work;
  assert.equal(received.length, 1);
  assert.equal(messages.length, enabled === false ? 0 : 1);
  assert.equal(received[0].options.silent, enabled === false);
  assert.equal(received[0].options.renotify, true);
}
console.log(
  "Neon-only selection, complete push-key aliases, and service-worker sound-on/muted/default behavior pass. No remote database or notification used.",
);
