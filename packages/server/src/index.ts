import { serve } from "bun";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { router } from "./trpc";
import { offersRouter } from "./routers";

export const appRouter = router({
  offers: offersRouter,
});

export type AppRouter = typeof appRouter;

const PORT = 3000;
const FRONTEND_DIR = join(import.meta.dir, "..", "..", "frontend", "dist");

async function loadEnv() {
  try {
    const file = join(import.meta.dir, "..", "..", "..", ".env");
    const txt = await Bun.file(file).text();
    for (const line of txt.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env not found
  }
}

await loadEnv();

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (path.startsWith("/trpc")) {
      return fetchRequestHandler({
        endpoint: "/trpc",
        req,
        router: appRouter,
        createContext: async () => ({}),
      });
    }

    let filePath = path === "/" ? join(FRONTEND_DIR, "index.html") : join(FRONTEND_DIR, path);

    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = extname(filePath);
      const contentType = MIME[ext] || "application/octet-stream";
      const file = Bun.file(filePath);
      return new Response(file, {
        headers: { "Content-Type": contentType },
      });
    }

    if (existsSync(join(FRONTEND_DIR, "index.html"))) {
      const file = Bun.file(join(FRONTEND_DIR, "index.html"));
      return new Response(file, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

const keyStatus = process.env.GOOGLE_MAPS_API_KEY ? "loaded" : "MISSING";
const taStatus = process.env.TRIPADVISOR_API_KEY ? "loaded" : "MISSING";
console.log(`SmartWakacje server → http://localhost:${PORT}`);
console.log(`Google API key     → ${keyStatus}`);
console.log(`TripAdvisor key    → ${taStatus}`);
console.log(`Trivago            → no API key needed`);
