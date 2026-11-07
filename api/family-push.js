import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { pool } from "../lib/auth.js";
import { deliverFamilyPush } from "../server/family-push.js";

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  const send = (status, body) => {
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };
  if (req.method !== "GET") return send(405, { error: "Method not allowed." });
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  const received = req.headers.authorization || "";
  if (
    !process.env.CRON_SECRET ||
    Buffer.byteLength(received) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  )
    return send(401, { error: "Unauthorized." });
  if (
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT
  )
    return send(503, { error: "Push setup is incomplete." });
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
    send(
      200,
      await deliverFamilyPush(pool, (...args) =>
        webpush.sendNotification(...args),
      ),
    );
  } catch {
    send(503, { error: "Push worker could not finish." });
  }
}
