import { pushConfiguration, isPushConfigured } from "./database-config.js";
import { familyReadiness } from "./family-readiness.js";
import { fromNodeHeaders } from "better-auth/node";
import { familyAction, FamilyError } from "./family.js";

export function createFamilyHandler(auth, pool) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    const send = (status, body) => {
      res.statusCode = status;
      res.end(JSON.stringify(body));
    };
    try {
      if (!["GET", "POST"].includes(req.method))
        return send(405, { error: "Method not allowed." });
      const readiness = await familyReadiness(pool);
      const push = pushConfiguration();
      const configured = readiness.householdReady && isPushConfigured(push);
      if (
        req.method === "GET" &&
        new URL(req.url, "http://local").searchParams.get("config") === "1"
      )
        return send(200, {
          ...readiness,
          pushConfigured: configured,
          publicKey: configured ? push.publicKey : null,
        });
      if (!readiness.householdReady)
        return send(503, {
          error:
            "Household setup is pending. Email login, Settings, FAQ and Privacy Policy remain available. The app owner must apply the family settings migration.",
        });
      if (req.method === "POST") {
        const origin = req.headers.origin;
        const expectedHost = req.headers.host;
        if (
          !origin ||
          new URL(origin).host !== expectedHost ||
          ![
            "https:",
            ...(process.env.NODE_ENV !== "production" ? ["http:"] : []),
          ].includes(new URL(origin).protocol)
        )
          return send(403, { error: "Same-origin requests required." });
        if (!req.headers["content-type"]?.startsWith("application/json"))
          return send(415, { error: "JSON required." });
      }
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!session?.user)
        return send(401, { error: "Sign in to manage your household." });
      let input = {};
      if (req.method === "POST") {
        if (req.body && typeof req.body === "object") {
          if (JSON.stringify(req.body).length > 120000)
            return send(413, { error: "Request too large." });
          input = req.body;
        } else {
          let body = "";
          for await (const chunk of req) {
            body += chunk;
            if (body.length > 120000)
              return send(413, { error: "Request too large." });
          }
          try {
            input = JSON.parse(body);
          } catch {
            return send(400, { error: "Invalid JSON." });
          }
        }
        if (!input || Array.isArray(input) || typeof input !== "object")
          return send(400, { error: "Invalid request." });
        if (input.action === "subscribe" && !configured)
          return send(503, {
            error: "Push delivery has not been configured by the app owner.",
          });
      }
      return send(200, await familyAction(pool, session.user, input));
    } catch (error) {
      if (error instanceof FamilyError)
        return send(error.status, { error: error.message });
      if (error.code === "23505")
        return send(409, {
          error:
            "Already linked or a concurrent change occurred. Refresh and retry.",
        });
      if (["42P01", "42703"].includes(error.code))
        return send(503, {
          error:
            "Household setup is pending: the app owner must apply the family settings migration.",
        });
      return send(500, {
        error:
          "Household service is unavailable. Your changes have not been confirmed.",
      });
    }
  };
}
