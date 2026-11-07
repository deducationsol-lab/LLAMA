import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

function loadProjectEnv() {
  try {
    const envPath = "/vercel/share/.env.project";
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const match = line.match(/^([^#=]+)=['"]?(.*?)['"]?$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^['"]|['"]$/g, "");
          if (!process.env[key]) process.env[key] = value;
        }
      }
    }
  } catch {}
}

loadProjectEnv();

export default defineConfig({
  plugins: [
    react(),
    {
      name: "llama-api",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith("/api/family")) {
            const { auth, pool } = await import("./server/auth.js");
            const { createFamilyHandler } = await import("./server/family-handler.js");
            return createFamilyHandler(auth, pool)(req, res);
          }
          if (req.url?.startsWith("/api/auth")) {
            const { auth } = await import("./server/auth.js");
            const { toNodeHandler } = await import("better-auth/node");
            return toNodeHandler(auth)(req, res);
          }
          if (req.url?.startsWith("/api/agent")) {
            const handler = (await import("./api/agent.js")).default;
            return handler(req, res);
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
