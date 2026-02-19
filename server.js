import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const PORT = 3000;
const ROOT = import.meta.dirname;
const DATA_DIR = join(ROOT, "data");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

/** Find newest offers_*.json in data/ */
function findLatestOffers() {
  if (!existsSync(DATA_DIR)) return null;
  const files = readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
    .map((f) => ({ name: f, mtime: statSync(join(DATA_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length ? join(DATA_DIR, files[0].name) : null;
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // API: auto-detect latest offers JSON
  if (path === "/api/offers") {
    const file = findLatestOffers();
    if (!file) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No offers_*.json found in data/" }));
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[".json"],
      "Access-Control-Allow-Origin": "*",
    });
    res.end(readFileSync(file));
    return;
  }

  // Static files
  let filePath;
  if (path === "/") {
    filePath = join(ROOT, "index.html");
  } else {
    // Only allow files from project root (index.html) and data/
    const safe = path.replace(/\.\./g, "");
    filePath = join(ROOT, safe);
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end("404");
    return;
  }

  const ext = extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(readFileSync(filePath));
});

server.listen(PORT, () => {
  console.log(`SmartWakacje UI → http://localhost:${PORT}`);
});
