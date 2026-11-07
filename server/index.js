import { createServer } from "node:http";
import handler from "../api/agent.js";
import { auth, pool } from "./auth.js";
import { createFamilyHandler } from "./family-handler.js";
const familyHandler = createFamilyHandler(auth, pool);

// Local companion to Vite; on Vercel the same handler lives at /api/agent.
const server = createServer(async (req, res) => {
  if (req.url?.split("?")[0] === "/api/family") return familyHandler(req, res);
  if (req.url?.split("?")[0] === "/api/agent") return handler(req, res);
  if (req.url?.startsWith("/api/auth")) {
    let body = "";
    for await (const chunk of req) body += chunk;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers,
      body: body || undefined,
    });
    const response = await auth.handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(await response.text());
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found." }));
});
server.listen(
  Number(process.env.PORT || 8080),
  process.env.HOST || "127.0.0.1",
  () => {
    console.log(
      "LLAMA API listening. Use GET /api/agent to check configuration.",
    );
  },
);
