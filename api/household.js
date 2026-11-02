import {
  publicSetup,
  database,
  authenticated,
  validSubscription,
  checked,
  deliverNotifications,
  cronAuthorized,
} from "../server/household.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  const send = (status, body) => {
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };
  try {
    const url = new URL(req.url, "https://llama.invalid");
    if (req.method === "GET" && url.searchParams.get("action") !== "dispatch")
      return send(200, publicSetup());
    if (req.method === "GET" && url.searchParams.get("action") === "dispatch") {
      if (!cronAuthorized(req.headers.authorization))
        return send(401, { error: "Unauthorized" });
      return send(200, await deliverNotifications(database()));
    }
    if (req.method !== "POST")
      return send(405, { error: "Method not allowed" });
    const db = database();
    const user = await authenticated(req, db);
    if (!user) return send(401, { error: "Sign in required." });
    let body = req.body;
    if (body === undefined) {
      let bytes = 0;
      const chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 6000) return send(413, { error: "Request too large." });
        chunks.push(Buffer.from(chunk));
      }
      body = Buffer.concat(chunks).toString();
    }
    if (typeof body === "string") {
      if (Buffer.byteLength(body) > 6000)
        return send(413, { error: "Request too large." });
      try {
        body = JSON.parse(body);
      } catch {
        return send(400, { error: "Invalid JSON." });
      }
    }
    if (!body || typeof body !== "object" || JSON.stringify(body).length > 6000)
      return send(400, { error: "Invalid request." });
    if (body.action === "subscribe") {
      if (!process.env.WEB_PUSH_PUBLIC_KEY || !process.env.WEB_PUSH_PRIVATE_KEY)
        return send(503, { error: "Web Push setup is incomplete." });
      if (!validSubscription(body.subscription))
        return send(400, { error: "Unsupported push subscription." });
      const memberships = await checked(
        db
          .from("household_members")
          .select("household_id")
          .eq("user_id", user.id),
      );
      if (!memberships.length)
        return send(403, { error: "Join a household first." });
      const owned = await checked(
        db
          .from("push_subscriptions")
          .select("id,user_id")
          .eq("endpoint", body.subscription.endpoint),
      );
      if (owned.length && owned[0].user_id !== user.id)
        return send(409, {
          error:
            "This browser is subscribed to another account. Disable notifications there first.",
        });
      const existing = await checked(
        db.from("push_subscriptions").select("id").eq("user_id", user.id),
      );
      if (existing.length >= 10 && !owned.length)
        return send(409, { error: "Device limit reached." });
      await checked(
        db
          .from("push_subscriptions")
          .upsert(
            {
              user_id: user.id,
              endpoint: body.subscription.endpoint,
              p256dh: body.subscription.keys.p256dh,
              auth: body.subscription.keys.auth,
            },
            { onConflict: "endpoint" },
          ),
      );
      return send(200, { ok: true });
    }
    if (body.action === "unsubscribe") {
      if (typeof body.endpoint !== "string")
        return send(400, { error: "Endpoint required." });
      await checked(
        db
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", body.endpoint),
      );
      return send(200, { ok: true });
    }
    return send(400, { error: "Unsupported action." });
  } catch {
    return send(503, {
      error:
        "Household service is unavailable. Check database migration and server setup.",
    });
  }
}
