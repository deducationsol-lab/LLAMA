import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { timingSafeEqual, createHash } from "node:crypto";

export function publicSetup(env = process.env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  let safe = false;
  try {
    const endpoint = new URL(url);
    const publicKey =
      typeof key === "string" &&
      (key.startsWith("sb_publishable_") ||
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "anon");
    safe =
      endpoint.protocol === "https:" &&
      !endpoint.username &&
      !endpoint.password &&
      Boolean(publicKey);
  } catch {
    /* Never return malformed setup or a service-role key as public config. */
  }
  return {
    configured: safe,
    url: safe ? url : null,
    publishableKey: safe ? key : null,
    pushPublicKey: env.WEB_PUSH_PUBLIC_KEY || null,
  };
}
export function database(env = process.env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY)
    throw new Error("Household server setup is incomplete.");
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function authenticated(req, db) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : data.user;
}
export function validSubscription(value) {
  if (
    !value ||
    typeof value.endpoint !== "string" ||
    value.endpoint.length > 2048
  )
    return false;
  try {
    const url = new URL(value.endpoint);
    // Only known push-service origins; never send signed/encrypted requests to user-selected arbitrary hosts.
    const host = url.hostname;
    const allowed =
      host === "fcm.googleapis.com" ||
      host === "updates.push.services.mozilla.com" ||
      host === "web.push.apple.com" ||
      host.endsWith(".push.apple.com") ||
      host === "wns2-par02p.notify.windows.com" ||
      host.endsWith(".notify.windows.com");
    return (
      allowed &&
      url.protocol === "https:" &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.hash &&
      ["p256dh", "auth"].every(
        (k) =>
          typeof value.keys?.[k] === "string" &&
          /^[A-Za-z0-9_-]+$/.test(value.keys[k]),
      ) &&
      Buffer.from(value.keys.p256dh, "base64url").length === 65 &&
      Buffer.from(value.keys.auth, "base64url").length === 16
    );
  } catch {
    return false;
  }
}
export function cronAuthorized(header, env = process.env) {
  if (!env.CRON_SECRET) return false;
  const digest = (s) => createHash("sha256").update(s).digest();
  return (
    typeof header === "string" &&
    timingSafeEqual(digest(header), digest(`Bearer ${env.CRON_SECRET}`))
  );
}
export async function checked(result) {
  const { data, error } = await result;
  if (error) throw new Error("Household database operation failed.");
  return data;
}

export async function deliverNotifications(
  db,
  env = process.env,
  send = webpush.sendNotification,
) {
  if (
    !env.WEB_PUSH_PUBLIC_KEY ||
    !env.WEB_PUSH_PRIVATE_KEY ||
    !env.WEB_PUSH_SUBJECT
  )
    throw new Error("Web Push is not configured.");
  const jobs = await checked(db.rpc("claim_notification_jobs"));
  const started = Date.now();
  let delivered = 0,
    finished = 0;
  for (const job of jobs) {
    if (Date.now() - started > 200000) break;
    try {
      const record = (
        await checked(
          db
            .from("household_records")
            .select("revision,status")
            .eq("id", job.record_id)
            .limit(1),
        )
      )[0];
      // Edits cancel older reminders, but update events must still be delivered.
      if (
        !job.activity_id &&
        (!record ||
          record.revision !== job.revision ||
          ["paid", "done"].includes(record.status))
      ) {
        await checked(
          db
            .from("notification_jobs")
            .update({ processed_at: new Date().toISOString() })
            .eq("id", job.id),
        );
        continue;
      }
      const members = await checked(
        db
          .from("household_members")
          .select("user_id")
          .eq("household_id", job.household_id),
      );
      const ids = members.map((m) => m.user_id);
      const subscriptions = ids.length
        ? await checked(
            db.from("push_subscriptions").select("*").in("user_id", ids),
          )
        : [];
      const prior = await checked(
        db
          .from("notification_deliveries")
          .select("subscription_id")
          .eq("job_id", job.id),
      );
      let failed = false;
      for (const sub of subscriptions) {
        if (Date.now() - started > 200000) {
          failed = true;
          break;
        }
        if (prior.some((p) => p.subscription_id === sub.id)) continue;
        const subscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        if (!validSubscription(subscription)) {
          failed = true;
          continue;
        }
        try {
          await send(
            subscription,
            JSON.stringify({
              title: "LLAMA household",
              body: job.activity_id
                ? "Your household has a new update. Open LLAMA for details."
                : "A household reminder is due. Open LLAMA for details.",
              tag: job.id,
              url: "/#household",
            }),
            {
              TTL: 3600,
              timeout: 10000,
              vapidDetails: {
                subject: env.WEB_PUSH_SUBJECT,
                publicKey: env.WEB_PUSH_PUBLIC_KEY,
                privateKey: env.WEB_PUSH_PRIVATE_KEY,
              },
            },
          );
          await checked(
            db
              .from("notification_deliveries")
              .insert({ job_id: job.id, subscription_id: sub.id }),
          );
          delivered++;
        } catch (error) {
          if ([404, 410].includes(error.statusCode))
            await checked(
              db.from("push_subscriptions").delete().eq("id", sub.id),
            );
          else failed = true;
        }
      }
      if (!failed) {
        await checked(
          db
            .from("notification_jobs")
            .update({ processed_at: new Date().toISOString() })
            .eq("id", job.id),
        );
        finished++;
      }
    } catch {
      /* Lease expires for a bounded retry. Never log subscriptions or credentials. */
    }
  }
  return { claimed: jobs.length, finished, delivered };
}
