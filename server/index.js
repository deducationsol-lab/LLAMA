import { createServer } from "node:http";
import handler from "../api/agent.js";
import householdHandler from "../api/household.js";

// Local companion to Vite; on Vercel the same handler lives at /api/agent.
const server = createServer((req, res) => {
  if (req.url?.split("?")[0] === "/api/household")
    return householdHandler(req, res);
  if (req.url?.split("?")[0] === "/api/agent") return handler(req, res);
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
