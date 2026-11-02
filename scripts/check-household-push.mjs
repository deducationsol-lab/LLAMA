import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import webpush from "web-push";
import {
  validSubscription,
  cronAuthorized,
  publicSetup,
  deliverNotifications,
} from "../server/household.js";
const keys = webpush.generateVAPIDKeys();
const sub = {
  endpoint: "https://fcm.googleapis.com/fcm/send/example",
  keys: {
    p256dh: Buffer.concat([Buffer.from([4]), randomBytes(64)]).toString(
      "base64url",
    ),
    auth: randomBytes(16).toString("base64url"),
  },
};
assert.equal(validSubscription(sub), true);
for (const endpoint of [
  "http://fcm.googleapis.com/x",
  "https://evil.invalid/x",
  "https://fcm.googleapis.com.evil.invalid/x",
  "https://127.0.0.1/x",
  "https://fcm.googleapis.com:444/x",
  "https://user:password@fcm.googleapis.com/x",
])
  assert.equal(validSubscription({ ...sub, endpoint }), false);
assert.equal(
  validSubscription({ ...sub, keys: { ...sub.keys, auth: "bad" } }),
  false,
);
const env = {
  CRON_SECRET: randomBytes(32).toString("hex"),
  WEB_PUSH_PUBLIC_KEY: keys.publicKey,
  WEB_PUSH_PRIVATE_KEY: keys.privateKey,
  WEB_PUSH_SUBJECT: "https://example.invalid",
};
assert.equal(cronAuthorized(`Bearer ${env.CRON_SECRET}`, env), true);
assert.equal(cronAuthorized("Bearer wrong", env), false);
assert.equal(cronAuthorized("", {}), false);
assert.equal(publicSetup({}).configured, false);
assert.equal(
  publicSetup({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_secret_private",
  }).configured,
  false,
);
assert.equal(
  publicSetup({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  }).configured,
  true,
);
assert.ok(
  !JSON.stringify(
    publicSetup({ ...env, SUPABASE_SECRET_KEY: "private" }),
  ).includes("private"),
);
// A fluent mock checks worker selection and delivery bookkeeping without contacting a push provider.
function fixture({ expired = false, stale = false, already = false } = {}) {
  const effects = [];
  const db = {
    rpc: async () => ({
      data: [
        {
          id: "job",
          record_id: "record",
          household_id: "family",
          revision: 2,
          activity_id: stale ? null : "activity",
        },
      ],
    }),
    from(table) {
      let operation = "select",
        value,
        filters = [];
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push([k, v]);
          return q;
        },
        in(k, v) {
          filters.push([k, v]);
          return q;
        },
        limit() {
          return q;
        },
        update(v) {
          operation = "update";
          value = v;
          return q;
        },
        insert(v) {
          operation = "insert";
          value = v;
          return q;
        },
        delete() {
          operation = "delete";
          return q;
        },
        then(resolve) {
          if (operation !== "select") {
            effects.push({ table, operation, value, filters });
            return Promise.resolve({ data: [] }).then(resolve);
          }
          let data = [];
          if (table === "household_records")
            data = [{ revision: 1, status: "pending" }];
          if (table === "household_members")
            data = [{ user_id: "actor" }, { user_id: "spouse" }];
          if (table === "push_subscriptions") {
            assert.deepEqual(filters, [["user_id", ["actor", "spouse"]]]);
            data = [{ id: "device", endpoint: sub.endpoint, ...sub.keys }];
          }
          if (table === "notification_deliveries" && already)
            data = [{ subscription_id: "device" }];
          return Promise.resolve({ data }).then(resolve);
        },
      };
      return q;
    },
  };
  return { db, effects };
}
let pushes = 0;
const f = fixture();
const result = await deliverNotifications(
  f.db,
  env,
  async (subscription, payload) => {
    pushes++;
    assert.equal(subscription.endpoint, sub.endpoint);
    const msg = JSON.parse(payload);
    assert.equal(msg.url, "/#household");
    assert.ok(!payload.includes("Electricity"));
  },
);
assert.equal(pushes, 1);
assert.equal(result.delivered, 1);
assert.ok(
  f.effects.some(
    (e) => e.table === "notification_deliveries" && e.operation === "insert",
  ),
);
const stale = fixture({ stale: true });
await deliverNotifications(stale.db, env, async () => {
  throw Error("Stale reminder must not send");
});
assert.ok(stale.effects.some((e) => e.table === "notification_jobs"));
const prior = fixture({ already: true });
await deliverNotifications(prior.db, env, async () => {
  throw Error("Already delivered");
});
const expired = fixture();
await deliverNotifications(expired.db, env, async () => {
  throw { statusCode: 410 };
});
assert.ok(
  expired.effects.some(
    (e) => e.table === "push_subscriptions" && e.operation === "delete",
  ),
);
const fail = fixture();
await deliverNotifications(fail.db, env, async () => {
  throw { statusCode: 503 };
});
assert.ok(
  !fail.effects.some(
    (e) => e.table === "notification_jobs" && e.value?.processed_at,
  ),
);
console.log(
  "Push checks passed: origin validation, secret auth, private payload, household membership filtering, durable bookkeeping, stale reminder cancellation, retry and expired-device removal. No real notifications sent.",
);
