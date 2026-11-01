import { createHash, timingSafeEqual } from "node:crypto";
import {
  AgentError,
  configuration,
  runAgent,
  validateInput,
} from "../server/llama.js";

const MAX_BYTES = 48000;
const digest = (value) => createHash("sha256").update(value).digest();
// Best-effort per-instance burst guard. The access code is the real demo access boundary.
const attempts = new Map();
const active = new Set();

export function createHandler({
  env = process.env,
  run = runAgent,
  now = Date.now,
  limits = attempts,
  running = active,
} = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const send = (status, data) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    };
    let accessHash;
    try {
      if (req.method === "GET") return send(200, configuration(env));
      if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return send(405, { error: "Method not allowed." });
      }
      if (!configuration(env).configured)
        throw new AgentError(
          503,
          "not_configured",
          "Llama is not connected. Complete the server-side API setup.",
        );
      const access = req.headers["x-llama-access-code"];
      if (
        typeof access !== "string" ||
        access.length > 256 ||
        !timingSafeEqual(digest(access), digest(env.LLAMA_ACCESS_CODE))
      )
        throw new AgentError(
          401,
          "access_required",
          "Enter the household demo access code, not your Meta API key.",
        );
      accessHash = digest(access).toString("hex");
      const timestamp = now();
      const bucket = limits.get(accessHash) || { since: timestamp, count: 0 };
      if (timestamp - bucket.since >= 60000) {
        bucket.since = timestamp;
        bucket.count = 0;
      }
      if (bucket.count >= 6 || running.has(accessHash)) {
        res.setHeader("Retry-After", "60");
        throw new AgentError(
          429,
          "demo_limit",
          "Please wait before sending another agent request.",
        );
      }
      bucket.count++;
      limits.set(accessHash, bucket);
      if (
        !String(req.headers["content-type"] || "").startsWith(
          "application/json",
        )
      )
        throw new AgentError(415, "json_required", "Send application/json.");
      if (Number(req.headers["content-length"] || 0) > MAX_BYTES)
        throw new AgentError(
          413,
          "request_too_large",
          "Household context is too large.",
        );
      let body = req.body;
      if (body === undefined) {
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          bytes += buffer.length;
          if (bytes > MAX_BYTES)
            throw new AgentError(
              413,
              "request_too_large",
              "Household context is too large.",
            );
          chunks.push(buffer);
        }
        body = Buffer.concat(chunks).toString("utf8");
      }
      if (
        Buffer.byteLength(
          typeof body === "string" ? body : JSON.stringify(body),
        ) > MAX_BYTES
      )
        throw new AgentError(
          413,
          "request_too_large",
          "Household context is too large.",
        );
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          throw new AgentError(400, "invalid_json", "Send valid JSON.");
        }
      }
      const input = validateInput(body);
      running.add(accessHash);
      try {
        return send(200, await run(input, { env }));
      } finally {
        running.delete(accessHash);
      }
    } catch (error) {
      if (error instanceof AgentError)
        return send(error.status, { code: error.code, error: error.message });
      // Never return provider bodies, request headers or credentials.
      return send(500, {
        code: "server_error",
        error: "The agent request could not be completed.",
      });
    }
  };
}

export default createHandler();
