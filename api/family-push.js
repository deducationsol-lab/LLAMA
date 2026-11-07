import {
  pushConfiguration,
  isPushConfigured,
} from "../server/database-config.js";
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
  const push = pushConfiguration();
  if (!isPushConfigured(push))
    return send(503, { error: "Push setup is incomplete." });
  try {
    webpush.setVapidDetails(push.subject, push.publicKey, push.privateKey);
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
