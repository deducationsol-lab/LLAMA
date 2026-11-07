// Offline database, HTTP and push regression checks. No real accounts or pushes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { familyAuthOptions } from "../server/family-auth.js";
import { PGlite } from "@electric-sql/pglite";
import {
  familyAction,
  validPushEndpoint,
  validateSharedData,
} from "../server/family.js";
import { deliverFamilyPush } from "../server/family-push.js";
import { createFamilyHandler } from "../server/family-handler.js";

const db = new PGlite();
const query = (sql, values) => db.query(sql, values);
const pool = { query, connect: async () => ({ query, release() {} }) };
const users = ["anchor", "member", "outsider"].map((id) => ({
  id,
  name: id,
  username: `${id}_test`,
}));
const [anchor, member, outsider] = users;
const call = (user, input) => familyAction(pool, user, input || {});
const denies = (promise, status) =>
  assert.rejects(promise, (error) => error.status === status);
const data = {
  travel: [
    {
      day: "Day 1",
      title: "Family trip",
      cost: 20,
      status: "Planned",
      notes: "",
    },
  ],
  bills: [
    {
      id: "bill-1",
      name: "Electricity",
      amount: 40,
      dueDate: "2026-12-01",
      status: "PENDING",
      category: "Home",
      agentNote: "",
    },
  ],
  groceries: [
    {
      id: "grocery-1",
      name: "Rice",
      category: "Custom",
      inPantry: false,
      estPrice: 5,
      recipeNeeded: "Added manually",
    },
  ],
  schedule: [{ time: "09:00", task: "School", category: "Family", focus: "" }],
  prefs: {
    familySize: 3,
    monthlyBudgetCap: 4000,
    dietary: "Halal",
    homeLocation: "KL",
    targetSleepDuration: "8 hours",
    travelBudgetLimit: 1000,
  },
};
try {
  await db.exec(
    'CREATE TABLE "user" (id text PRIMARY KEY, name text NOT NULL)',
  );
  const migration = await readFile(
    new URL("../migrations/20261107_family_settings.sql", import.meta.url),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration); // Safe to re-run.
  for (const user of users)
    await query('INSERT INTO "user"(id,name,username) VALUES($1,$2,$3)', [
      user.id,
      user.name,
      user.username,
    ]);
  assert.equal((await call(anchor)).household, null);
  await denies(call(outsider, { action: "save", revision: 0, data }), 400);
  const created = await call(anchor, { action: "create", name: "Test family" });
  assert.equal(created.household.ownerId, anchor.id);
  await assert.rejects(
    query('DELETE FROM "user" WHERE id=$1', [anchor.id]),
    /foreign key/i,
  );
  await denies(call(anchor, { action: "create", name: "Second family" }), 409);
  let invite = await call(anchor, {
    action: "invite",
    username: member.username,
  });
  assert.ok(invite.invitationCode);
  const stored = (await query("SELECT * FROM family_invites")).rows[0];
  assert.notEqual(stored.token_hash, invite.invitationCode);
  await denies(
    call(outsider, { action: "join", code: invite.invitationCode }),
    403,
  );
  const joined = await call(member, {
    action: "join",
    code: invite.invitationCode,
  });
  assert.equal(joined.members.length, 2);
  assert.equal(joined.invites.length, 0);
  await denies(
    call(outsider, { action: "join", code: invite.invitationCode }),
    400,
  );
  assert.equal((await call(outsider)).household, null);
  await denies(call(member, { action: "invite", username: "another" }), 403);
  await denies(
    call(member, { action: "delete-household", confirmation: "Test family" }),
    403,
  );
  await denies(call(member, { action: "transfer", userId: member.id }), 403);
  await denies(call(anchor, { action: "leave" }), 400);
  const saved = await call(anchor, { action: "save", revision: 0, data });
  assert.equal(saved.household.revision, 1);
  assert.deepEqual((await call(member)).household.data, data);
  await denies(call(member, { action: "save", revision: 0, data }), 409);
  assert.throws(
    () =>
      validateSharedData({ ...data, bills: [{ ...data.bills[0], name: {} }] }),
    /text/,
  );
  assert.throws(
    () =>
      validateSharedData({
        ...data,
        bills: [{ ...data.bills[0], amount: -1 }],
      }),
    /amount/,
  );
  assert.throws(
    () =>
      validateSharedData({ ...data, bills: Array(101).fill(data.bills[0]) }),
    /100/,
  );
  assert.equal(validPushEndpoint("https://example.com/push"), false);
  assert.equal(
    validPushEndpoint("https://fcm.googleapis.com.attacker.invalid/push"),
    false,
  );
  assert.equal(
    validPushEndpoint("https://user:pass@fcm.googleapis.com/push"),
    false,
  );
  assert.equal(
    validPushEndpoint("https://fcm.googleapis.com:8443/push"),
    false,
  );
  assert.equal(validPushEndpoint("https://fcm.googleapis.com/push"), true);
  const subscription = (suffix) => ({
    endpoint: `https://fcm.googleapis.com/fcm/send/${suffix}`,
    keys: {
      auth: randomBytes(16).toString("base64url"),
      p256dh: randomBytes(65).toString("base64url"),
    },
  });
  const anchorDevice = subscription("anchor-test");
  const memberDevice = subscription("member-test");
  await call(anchor, { action: "subscribe", subscription: anchorDevice });
  await call(member, { action: "subscribe", subscription: memberDevice });
  await denies(
    call(member, { action: "subscribe", subscription: anchorDevice }),
    409,
  );
  await denies(
    call(member, {
      action: "subscribe",
      subscription: { ...memberDevice, endpoint: "http://127.0.0.1/push" },
    }),
    400,
  );
  const future = new Date(Date.now() + 3600000).toISOString();
  const withReminder = await call(member, {
    action: "remind",
    kind: "bill",
    label: "Private bill label",
    dueAt: future,
  });
  assert.equal(withReminder.reminders.length, 1);
  await denies(
    call(member, {
      action: "remind",
      kind: "bill",
      label: "Bad",
      dueAt: "invalid",
    }),
    400,
  );
  await query("UPDATE family_devices SET created_at=now()-interval '1 minute'");
  await query("UPDATE family_reminders SET due_at=now()-interval '1 second'");
  const sent = [];
  const sender = async (sub, payload) => {
    sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
  };
  await deliverFamilyPush(pool, sender);
  assert.equal(sent.length, 4); // update and bill reminder, two opted-in devices
  assert.ok(
    sent.every(
      (item) => !JSON.stringify(item.payload).includes("Private bill label"),
    ),
  );
  await deliverFamilyPush(pool, sender);
  assert.equal(sent.length, 4); // no replay after successful delivery
  await call(anchor, {
    action: "cancel-reminder",
    id: withReminder.reminders[0].id,
  });
  assert.equal((await call(member)).reminders.length, 0);
  const retryReminder = await call(member, {
    action: "remind",
    kind: "activity",
    label: "Private activity",
    dueAt: future,
  });
  const retryId = retryReminder.reminders[0].id;
  await query(
    "UPDATE family_reminders SET due_at=now()-interval '1 second' WHERE id=$1",
    [retryId],
  );
  let failedAttempts = 0;
  await deliverFamilyPush(pool, async () => {
    failedAttempts++;
    throw Object.assign(new Error("Mock transient error"), { statusCode: 503 });
  });
  assert.equal(failedAttempts, 2);
  await deliverFamilyPush(pool, async () => {
    throw new Error("A leased retry should not send yet");
  });
  assert.equal(
    (
      await query(
        "SELECT attempts FROM family_deliveries WHERE reminder_id=$1",
        [retryId],
      )
    ).rows[0].attempts,
    1,
  );
  await query(
    "UPDATE family_deliveries SET lease_until=now()-interval '1 second' WHERE reminder_id=$1",
    [retryId],
  );
  await deliverFamilyPush(pool, async () => {
    throw Object.assign(new Error("Mock expired subscription"), {
      statusCode: 410,
    });
  });
  assert.equal((await query("SELECT * FROM family_devices")).rows.length, 0);
  await call(anchor, { action: "remove-member", userId: member.id });
  assert.equal((await call(member)).household, null);
  assert.equal(
    (await query("SELECT * FROM family_devices WHERE user_id=$1", [member.id]))
      .rows.length,
    0,
  );
  invite = await call(anchor, { action: "invite", username: member.username });
  await query("UPDATE family_invites SET expires_at=now()-interval '1 minute'");
  await denies(
    call(member, { action: "join", code: invite.invitationCode }),
    400,
  );
  invite = await call(anchor, { action: "invite", username: member.username });
  await call(anchor, {
    action: "revoke-invite",
    id: (await call(anchor)).invites[0].id,
  });
  await denies(
    call(member, { action: "join", code: invite.invitationCode }),
    400,
  );
  invite = await call(anchor, { action: "invite", username: member.username });
  await call(member, { action: "join", code: invite.invitationCode });
  await call(anchor, { action: "transfer", userId: member.id });
  await call(anchor, { action: "leave" });
  await query('DELETE FROM "user" WHERE id=$1', [anchor.id]); // No ownership blocker now.
  await denies(
    call(member, { action: "delete-household", confirmation: "wrong" }),
    400,
  );
  await call(member, {
    action: "delete-household",
    confirmation: "Test family",
  });
  assert.equal((await query("SELECT * FROM family_members")).rows.length, 0);
  assert.equal((await query("SELECT * FROM family_reminders")).rows.length, 0);
  assert.equal((await query("SELECT * FROM family_deliveries")).rows.length, 0);
  assert.equal((await query("SELECT * FROM family_devices")).rows.length, 0);

  // Exercise the HTTP boundary with a fake session resolver; no real credentials.
  const handler = createFamilyHandler(
    {
      api: {
        getSession: async ({ headers }) =>
          headers.get("x-test-user") ? { user: member } : null,
      },
    },
    pool,
  );
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${origin}/api/family`)).status, 401);
    assert.equal((await fetch(`${origin}/api/family?config=1`)).status, 200);
    const post = (body, extra = {}) =>
      fetch(`${origin}/api/family`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user": "member",
          Origin: origin,
          ...extra,
        },
        body,
      });
    assert.equal(
      (await post("{}", { Origin: "https://attacker.invalid" })).status,
      403,
    );
    assert.equal((await post("{invalid")).status, 400);
    assert.equal(
      (await post("{}", { "Content-Type": "text/plain" })).status,
      415,
    );
    assert.equal(
      (await post(JSON.stringify({ action: "create", name: "HTTP family" })))
        .status,
      200,
    );
    assert.equal((await post("{}", { "x-test-user": "" })).status, 401);
    assert.equal(
      (await post(JSON.stringify({ action: "unknown" }))).status,
      400,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  // Use the installed SDK and the exact plugin/deletion hook with isolated auth storage.
  const authStore = { user: [], session: [], account: [], verification: [] };
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: randomBytes(32).toString("hex"),
    database: memoryAdapter(authStore),
    emailAndPassword: { enabled: true },
    session: { freshAge: 300 },
    ...familyAuthOptions(pool),
    logger: { disabled: true },
  });
  const password = randomBytes(18).toString("base64url");
  const response = await auth.api.signUpEmail({
    body: {
      name: "SDK test",
      email: "sdk@example.test",
      password,
      username: "Family_SDK",
    },
    asResponse: true,
  });
  assert.equal(response.status, 200);
  const signup = await response.json();
  assert.equal(signup.user.username, "family_sdk");
  const headers = new Headers({
    cookie: response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; "),
  });
  await query('INSERT INTO "user"(id,name,username) VALUES($1,$2,$3)', [
    signup.user.id,
    "SDK test",
    signup.user.username,
  ]);
  assert.equal(
    (
      await auth.api.signInUsername({
        body: { username: "FAMILY_SDK", password },
      })
    ).user.id,
    signup.user.id,
  );
  await assert.rejects(
    auth.api.signInUsername({
      body: { username: "family_sdk", password: "not-the-password" },
    }),
  );
  await assert.rejects(
    auth.api.signUpEmail({
      body: {
        name: "Other",
        email: "other@example.test",
        password,
        username: "family_sdk",
      },
    }),
  );
  const sdkUser = {
    id: signup.user.id,
    name: "SDK test",
    username: signup.user.username,
  };
  await call(sdkUser, { action: "create", name: "SDK household" });
  await assert.rejects(
    auth.api.deleteUser({ headers, body: { password } }),
    /anchor/i,
  );
  await call(sdkUser, {
    action: "delete-household",
    confirmation: "SDK household",
  });
  await assert.rejects(
    auth.api.deleteUser({ headers, body: { password: "not-the-password" } }),
  );
  const deleted = await auth.api.deleteUser({ headers, body: { password } });
  assert.equal(deleted.success, true);
  assert.equal(await auth.api.getSession({ headers }), null);
  await query('DELETE FROM "user" WHERE id=$1', [signup.user.id]);
  console.log(
    "Family checks passed: real PostgreSQL schema, roles, one-use/expired/revoked invites, isolation, shared records/conflicts, deletion constraints, subscriptions, generic push, delivery deduplication, HTTP authorization/CSRF and SDK username login/password-checked deletion. No real accounts or pushes.",
  );
} finally {
  await db.close();
}
