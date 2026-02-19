import { createServer } from "node:http";
import https from "node:https";
import {
  readFileSync, writeFileSync, readdirSync,
  existsSync, statSync, mkdirSync,
} from "node:fs";
import { join, extname } from "node:path";

const PORT = 3000;
const ROOT = import.meta.dirname;
const DATA_DIR = join(ROOT, "data");
const CACHE_FILE = join(DATA_DIR, "google-ratings-cache.json");

// ── .env loader ─────────────────────────────────────────────
(function loadEnv() {
  try {
    const txt = readFileSync(join(ROOT, ".env"), "utf-8");
    for (const line of txt.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const idx = t.indexOf("=");
      if (idx === -1) continue;
      const key = t.slice(0, idx).trim();
      const val = t.slice(idx + 1).trim();
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch { /* .env not found — rely on env vars */ }
})();

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const COUNTRY_EN = {
  Tunezja: "Tunisia", Turcja: "Turkey", Egipt: "Egypt",
  Grecja: "Greece", Hiszpania: "Spain", Chorwacja: "Croatia",
  "Bułgaria": "Bulgaria", Cypr: "Cyprus", Maroko: "Morocco",
  Portugalia: "Portugal", "Włochy": "Italy", "Czarnogóra": "Montenegro",
  Albania: "Albania", Malta: "Malta",
};

// ── Helpers ──────────────────────────────────────────────────

/** Find newest offers_*.json in data/ */
function findLatestOffers() {
  if (!existsSync(DATA_DIR)) return null;
  const files = readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
    .map((f) => ({ name: f, mtime: statSync(join(DATA_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length ? join(DATA_DIR, files[0].name) : null;
}

/** Load cache from disk */
function loadCache() {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

/** Save cache to disk */
function saveCache(cache) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/** Strip parenthesized parts: "Long Beach (Avsallar)" → "Long Beach" */
function normalizeName(name) {
  return name.replace(/\s*\(.*?\)\s*/g, " ").trim();
}

/** HTTPS GET → parsed JSON */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode !== 200)
          return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
        resolve(JSON.parse(raw));
      });
    }).on("error", reject);
  });
}

/** Parse request body as JSON */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

/** Send JSON response */
function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

// ── Google Places Text Search (Legacy) ──────────────────────

async function searchGoogle(name, city, country) {
  const cleanName = normalizeName(name);
  const countryEn = COUNTRY_EN[country] || country || "";
  const query = `${cleanName} hotel ${city || ""} ${countryEn}`.trim();

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", GOOGLE_API_KEY);
  url.searchParams.set("type", "lodging");
  url.searchParams.set("language", "en");

  const data = await httpGet(url.toString());

  if (data.status === "OK" && data.results?.length > 0) {
    return data.results.slice(0, 5).map((r) => ({
      name: r.name || "",
      rating: r.rating || 0,
      totalRatings: r.user_ratings_total || 0,
      address: r.formatted_address || "",
      placeId: r.place_id || "",
      mapsUrl: r.place_id
        ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}`
        : null,
    }));
  }

  return [];
}

// ── Server ───────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // ── API: offers list ──────────────────────────────────────
  if (path === "/api/offers" && req.method === "GET") {
    const file = findLatestOffers();
    if (!file) return json(res, 404, { error: "No offers_*.json found in data/" });
    res.writeHead(200, {
      "Content-Type": MIME[".json"],
      "Access-Control-Allow-Origin": "*",
    });
    res.end(readFileSync(file));
    return;
  }

  // ── API: google rating (with cache) ───────────────────────
  if (path === "/api/google-rating" && req.method === "GET") {
    const name = url.searchParams.get("name");
    const city = url.searchParams.get("city") || "";
    const country = url.searchParams.get("country") || "";

    if (!name) return json(res, 400, { error: "Missing 'name' param" });
    if (!GOOGLE_API_KEY) return json(res, 500, { error: "Missing GOOGLE_MAPS_API_KEY in .env" });

    const cache = loadCache();

    // Check cache
    if (cache[name]) {
      return json(res, 200, { results: cache[name].results, selected: cache[name].selected ?? null, fromCache: true });
    }

    // Fetch from Google
    try {
      const results = await searchGoogle(name, city, country);
      cache[name] = { results, selected: results.length === 1 ? 0 : null, fetchedAt: new Date().toISOString() };
      saveCache(cache);

      // If single result, also update offers JSON
      if (results.length === 1) {
        updateOfferInJSON(name, results[0]);
      }

      return json(res, 200, { results, selected: cache[name].selected, fromCache: false });
    } catch (err) {
      return json(res, 502, { error: err.message });
    }
  }

  // ── API: select google rating result ──────────────────────
  if (path === "/api/google-rating/select" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const { hotelName, selectedIndex } = body;

      if (!hotelName || selectedIndex == null) {
        return json(res, 400, { error: "Missing hotelName or selectedIndex" });
      }

      const cache = loadCache();
      if (!cache[hotelName]?.results?.[selectedIndex]) {
        return json(res, 404, { error: "Hotel or index not in cache" });
      }

      cache[hotelName].selected = selectedIndex;
      saveCache(cache);

      const selected = cache[hotelName].results[selectedIndex];
      updateOfferInJSON(hotelName, selected);

      return json(res, 200, { ok: true, selected });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  // ── Static files ──────────────────────────────────────────
  let filePath;
  if (path === "/") {
    filePath = join(ROOT, "index.html");
  } else {
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

/** Update googleRating fields in the offers JSON file for all matching offers */
function updateOfferInJSON(hotelName, result) {
  const file = findLatestOffers();
  if (!file) return;

  const offers = JSON.parse(readFileSync(file, "utf-8"));
  let changed = false;

  for (const o of offers) {
    if (o.name === hotelName) {
      o.googleRating = result.rating;
      o.googleRatingsTotal = result.totalRatings;
      o.googleMapsUrl = result.mapsUrl;
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(file, JSON.stringify(offers, null, 2));
  }
}

server.listen(PORT, () => {
  const keyStatus = GOOGLE_API_KEY ? "loaded" : "MISSING — set GOOGLE_MAPS_API_KEY in .env";
  console.log(`SmartWakacje UI  → http://localhost:${PORT}`);
  console.log(`Google API key   → ${keyStatus}`);
});
