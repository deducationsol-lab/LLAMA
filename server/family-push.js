import { randomUUID } from "node:crypto";
import { validPushEndpoint } from "./family.js";

// Delivery bookkeeping never stores full notification text or provider response bodies.
export async function deliverFamilyPush(pool, send, now = new Date()) {
  await pool.query(
    "DELETE FROM family_reminders WHERE due_at < $1::timestamptz - interval '7 days'",
    [now.toISOString()],
  );
  // Only current members and opted-in devices get jobs. Bound work per invocation.
  await pool.query(
    `INSERT INTO family_deliveries(reminder_id,device_id)
    SELECT r.id,d.id FROM family_reminders r
    JOIN family_members m ON m.household_id=r.household_id
    JOIN family_devices d ON d.user_id=m.user_id
    WHERE r.due_at<=$1 AND r.due_at>$1::timestamptz-interval '1 day' AND d.created_at<=r.due_at
    ON CONFLICT DO NOTHING`,
    [now.toISOString()],
  );
  // Unique lease token prevents a timed-out worker from completing another worker's lease.
  const lease = randomUUID();
  const { rows } = await pool.query(
    `WITH jobs AS (
    SELECT reminder_id,device_id FROM family_deliveries WHERE delivered_at IS NULL AND attempts<4
    AND (lease_until IS NULL OR lease_until<now()) LIMIT 10 FOR UPDATE SKIP LOCKED
  ) UPDATE family_deliveries j SET lease_until=now()+interval '5 minutes',attempts=j.attempts+1,lease_token=$1
    FROM jobs WHERE j.reminder_id=jobs.reminder_id AND j.device_id=jobs.device_id RETURNING j.*`,
    [lease],
  );
  let delivered = 0;
  for (const job of rows) {
    const current = await pool.query(
      `SELECT d.subscription,r.kind FROM family_devices d
      JOIN family_members m ON m.user_id=d.user_id
      JOIN family_reminders r ON r.household_id=m.household_id
      WHERE d.id=$1 AND r.id=$2 AND r.due_at<=now()`,
      [job.device_id, job.reminder_id],
    );
    const item = current.rows[0];
    if (!item) {
      await pool.query(
        "DELETE FROM family_deliveries WHERE reminder_id=$1 AND device_id=$2 AND lease_token=$3",
        [job.reminder_id, job.device_id, lease],
      );
      continue;
    }
    try {
      if (!validPushEndpoint(item.subscription.endpoint))
        throw Object.assign(new Error("Invalid push origin"), {
          statusCode: 410,
        });
      await send(
        item.subscription,
        JSON.stringify({
          title: "LLAMA household",
          body:
            item.kind === "update"
              ? "Your household has an update. Open LLAMA to view it."
              : "You have a household reminder. Open LLAMA to view it.",
          url: "/",
        }),
        { TTL: 3600, timeout: 10000 },
      );
      await pool.query(
        "UPDATE family_deliveries SET delivered_at=now(),lease_until=NULL WHERE reminder_id=$1 AND device_id=$2 AND lease_token=$3",
        [job.reminder_id, job.device_id, lease],
      );
      delivered++;
    } catch (error) {
      if ([404, 410].includes(error.statusCode))
        await pool.query("DELETE FROM family_devices WHERE id=$1", [
          job.device_id,
        ]);
      // Keep lease until retry time; do not log endpoints, keys, or provider errors.
    }
  }
  return { processed: rows.length, delivered };
}
