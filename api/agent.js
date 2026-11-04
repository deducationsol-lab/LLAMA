import { AgentError, configuration, runAgent, validateInput } from "../server/llama.js";

const MAX_BYTES = 48000;
// Free tier: generous but prevents abuse - per IP rate limiting
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
    try {
      if (req.method === "GET") {
        const config = configuration(env);
        return send(200, { ...config, freeTier: true, message: "LLAMA is free for everyone. Just connect your household to get started." });
      }
      if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return send(405, { error: "Method not allowed." });
      }
      if (!configuration(env).configured)
        throw new AgentError(
          503,
          "not_configured",
          "LLAMA AI is not configured. The server needs a GEMINI_API_KEY.",
        );

      // Free tier rate limiting by IP (generous: 10 req/min, 100 req/hour)
      const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
      const timestamp = now();
      const bucket = limits.get(ip) || { since: timestamp, count: 0, hourSince: timestamp, hourCount: 0 };
      
      // Reset minute bucket
      if (timestamp - bucket.since >= 60000) {
        bucket.since = timestamp;
        bucket.count = 0;
      }
      // Reset hour bucket
      if (timestamp - bucket.hourSince >= 3600000) {
        bucket.hourSince = timestamp;
        bucket.hourCount = 0;
      }
      
      if (bucket.count >= 10 || bucket.hourCount >= 100 || running.has(ip)) {
        res.setHeader("Retry-After", "60");
        throw new AgentError(
          429,
          "rate_limit",
          "You're sending requests too quickly. Please wait a moment.",
        );
      }
      bucket.count++;
      bucket.hourCount++;
      limits.set(ip, bucket);

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
      running.add(ip);
      try {
        const result = await run(input, { env });
        return send(200, result);
      } finally {
        running.delete(ip);
      }
    } catch (error) {
      if (error instanceof AgentError)
        return send(error.status, { code: error.code, error: error.message });
      return send(500, {
        code: "server_error",
        error: "The agent request could not be completed.",
      });
    }
  };
}

export default createHandler();
