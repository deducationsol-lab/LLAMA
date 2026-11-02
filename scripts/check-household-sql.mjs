import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to authenticated,anon,service_role; grant execute on function auth.uid() to authenticated;`,
);
await db.exec(
  readFileSync(
    new URL(
      "../supabase/migrations/202611020001_households.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const users = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];
for (const id of users)
  await db.query("insert into auth.users values($1)", [id]);
async function asUser(id) {
  await db.exec("reset role");
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
  await db.exec("set role authenticated");
}
const value = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.id;
await asUser(users[0]);
const hid = await value(`select public.create_household('Family') as id`);
assert.ok(hid);
const invite = await value("select public.create_household_invite($1) as id", [
  hid,
]);
const rid = await value(
  `select public.save_household_record($1,null,0,'bill','Electricity','pending',null,null) as id`,
  [hid],
);
assert.equal(
  (await db.query("select * from public.household_activity")).rows.length,
  1,
);
await asUser(users[2]);
assert.equal(
  (await db.query("select * from public.household_records")).rows.length,
  0,
);
await assert.rejects(
  db.query(
    `select public.save_household_record($1,$2,1,'bill','Hacked','paid',null,null)`,
    [hid, rid],
  ),
  /Membership/,
);
await assert.rejects(
  db.query(`insert into public.household_members values($1,$2)`, [
    hid,
    users[2],
  ]),
  /permission/,
);
await assert.rejects(
  db.query("select * from public.household_invites"),
  /permission/,
);
await asUser(users[1]);
assert.equal(
  await value("select public.join_household($1) as id", [invite]),
  hid,
);
await assert.rejects(
  db.query("select public.join_household($1)", [invite]),
  /Already/,
);
await db.query(
  `select public.save_household_record($1,$2,1,'bill','Electricity','paid',null,null)`,
  [hid, rid],
);
await asUser(users[0]);
assert.equal(
  (
    await db.query("select status from public.household_records where id=$1", [
      rid,
    ])
  ).rows[0].status,
  "paid",
);
await assert.rejects(
  db.query(
    `select public.save_household_record($1,$2,1,'bill','Electricity','pending',null,null)`,
    [hid, rid],
  ),
  /another device/,
);
await assert.rejects(
  db.query(
    `select public.save_household_record($1,null,0,'pickup','School','paid',null,null)`,
    [hid],
  ),
  /Invalid record/,
);
await assert.rejects(
  db.query(
    `select public.save_household_record($1,null,0,'pickup','School','scheduled',null,now()-interval '1 hour')`,
    [hid],
  ),
  /next year/,
);
await assert.rejects(
  db.query("select public.claim_notification_jobs()"),
  /permission/,
);
await db.exec("reset role");
assert.equal(
  (await db.query("select * from public.notification_jobs")).rows.length,
  2,
);
await db.exec("set role service_role");
assert.equal(
  (await db.query("select * from public.claim_notification_jobs()")).rows
    .length,
  2,
);
assert.equal(
  (await db.query("select * from public.claim_notification_jobs()")).rows
    .length,
  0,
);
await asUser(users[1]);
await db.query("select public.leave_household($1)", [hid]);
assert.equal(
  (await db.query("select * from public.household_records")).rows.length,
  0,
);
await db.exec("reset role;set role anon");
await assert.rejects(
  db.query("select * from public.household_records"),
  /permission/,
);
console.log(
  "SQL checks passed: two-member sharing, household isolation, RPC grants, invite join, optimistic concurrency, atomic activity/outbox, reminders and worker leasing.",
);
await db.close();
