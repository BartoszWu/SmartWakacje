#!/usr/bin/env node

/**
 * Enriches parsed offers JSON with Google Maps ratings.
 * Only processes hotels with ratingValue >= 8.5 and price > 14000.
 * Uses google-ratings-cache.json to avoid duplicate API calls.
 * Sends requests in parallel batches for speed.
 *
 * Usage:  node enrich-ratings.js [path/to/offers.json]
 *         If no path given, auto-detects newest data/offers_*.json
 *
 * Adds to each qualifying offer:
 *   googleRating        — Google Maps rating (0 if not found)
 *   googleRatingsTotal  — number of Google reviews (0 if not found)
 *   googleMapsUrl       — link to Google Maps place (null if not found)
 */

import https from "node:https";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";

// ── Config (loaded from .env) ───────────────────────────────
await loadEnv();
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY in .env");
  process.exit(1);
}
const MIN_RATING = 8.5;
const MIN_PRICE = 14000;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;
const CACHE_FILE = "data/google-ratings-cache.json";
// ────────────────────────────────────────────────────────────

/**
 * Minimal .env loader — no external deps.
 */
async function loadEnv() {
  try {
    const txt = await readFile(".env", "utf-8");
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
    // .env not found — rely on actual env vars
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findNewestOffers() {
  const files = await readdir("data");
  const offerFiles = files
    .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (!offerFiles.length) throw new Error("No offers_*.json found in data/");
  return `data/${offerFiles[0]}`;
}

function normalizeName(name) {
  return name.replace(/\s*\(.*?\)\s*/g, " ").trim();
}

const COUNTRY_EN = {
  Tunezja: "Tunisia", Turcja: "Turkey", Egipt: "Egypt",
  Grecja: "Greece", Hiszpania: "Spain", Chorwacja: "Croatia",
  "Bułgaria": "Bulgaria", Cypr: "Cyprus", Maroko: "Morocco",
  Portugalia: "Portugal", "Włochy": "Italy", "Czarnogóra": "Montenegro",
  Albania: "Albania", Malta: "Malta",
};

function get(url) {
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

/** Load shared cache (same file used by server.js) */
async function loadCache() {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await mkdir("data", { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Fetch Google Maps rating — checks cache first, then API.
 * Returns top result from Google (or cache). Writes to cache.
 */
async function fetchGoogleRating(name, city, country, cache) {
  // Cache hit
  if (cache[name]?.results?.length > 0) {
    const idx = cache[name].selected ?? 0;
    const r = cache[name].results[idx];
    return { rating: r.rating, totalRatings: r.totalRatings, mapsUrl: r.mapsUrl, fromCache: true };
  }
  if (cache[name] && cache[name].results?.length === 0) {
    return { rating: 0, totalRatings: 0, mapsUrl: null, fromCache: true };
  }

  // API call
  const cleanName = normalizeName(name);
  const countryEn = COUNTRY_EN[country] || country || "";
  const query = `${cleanName} hotel ${city || ""} ${countryEn}`.trim();

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", GOOGLE_API_KEY);
  url.searchParams.set("type", "lodging");
  url.searchParams.set("language", "en");

  const data = await get(url.toString());

  if (data.status === "OK" && data.results?.length > 0) {
    const results = data.results.slice(0, 5).map((r) => ({
      name: r.name || "",
      rating: r.rating || 0,
      totalRatings: r.user_ratings_total || 0,
      address: r.formatted_address || "",
      placeId: r.place_id || "",
      mapsUrl: r.place_id
        ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}`
        : null,
    }));

    cache[name] = { results, selected: 0, fetchedAt: new Date().toISOString() };
    const r = results[0];
    return { rating: r.rating, totalRatings: r.totalRatings, mapsUrl: r.mapsUrl, fromCache: false };
  }

  cache[name] = { results: [], selected: null, fetchedAt: new Date().toISOString() };
  return { rating: 0, totalRatings: 0, mapsUrl: null, fromCache: false };
}

// ── Main ────────────────────────────────────────────────────

const filePath = process.argv[2] || (await findNewestOffers());
console.log(`Enriching: ${filePath}`);
console.log(`Filter:    ratingValue >= ${MIN_RATING}, price > ${MIN_PRICE.toLocaleString("pl")} zl`);
console.log(`Batch:     ${BATCH_SIZE} parallel, ${BATCH_DELAY_MS}ms between batches\n`);

const offers = JSON.parse(await readFile(filePath, "utf-8"));
const cache = await loadCache();

// Deduplicate hotels matching filters
const seen = new Set();
const hotels = [];
for (const o of offers) {
  if (seen.has(o.name)) continue;
  seen.add(o.name);
  if ((o.ratingValue || 0) >= MIN_RATING && (o.price || 0) > MIN_PRICE) hotels.push(o);
}

console.log(`Unique hotels matching filters: ${hotels.length}\n`);

let found = 0;
let apiCalls = 0;
const notFound = [];
let completed = 0;

// Process in parallel batches
for (let b = 0; b < hotels.length; b += BATCH_SIZE) {
  const batch = hotels.slice(b, b + BATCH_SIZE);

  await Promise.all(batch.map(async (h) => {
    const idx = hotels.indexOf(h);
    try {
      const g = await fetchGoogleRating(h.name, h.city, h.country, cache);
      if (!g.fromCache) apiCalls++;

      for (const o of offers) {
        if (o.name === h.name) {
          o.googleRating = g.rating;
          o.googleRatingsTotal = g.totalRatings;
          o.googleMapsUrl = g.mapsUrl;
        }
      }

      completed++;
      const tag = g.fromCache ? "cache" : "api";
      if (g.rating > 0) {
        found++;
        process.stdout.write(`  ${completed}/${hotels.length} ${h.name} -> ${g.rating} (${g.totalRatings}) [${tag}]\n`);
      } else {
        notFound.push(h);
        process.stdout.write(`  ${completed}/${hotels.length} ${h.name} -> \u2717 not found [${tag}]\n`);
      }
    } catch (err) {
      for (const o of offers) {
        if (o.name === h.name) { o.googleRating = 0; o.googleRatingsTotal = 0; o.googleMapsUrl = null; }
      }
      notFound.push(h);
      completed++;
      process.stdout.write(`  ${completed}/${hotels.length} ${h.name} -> \u2717 error: ${err.message}\n`);
    }
  }));

  if (b + BATCH_SIZE < hotels.length) await sleep(BATCH_DELAY_MS);
}

await saveCache(cache);
await writeFile(filePath, JSON.stringify(offers, null, 2));

// ── Summary ─────────────────────────────────────────────────
console.log(`\n--- Done ---`);
console.log(`Hotels:    ${hotels.length}`);
console.log(`Found:     ${found} (${((found / hotels.length) * 100).toFixed(1)}%)`);
console.log(`Not found: ${notFound.length}`);
console.log(`API calls: ${apiCalls} (${hotels.length - apiCalls} from cache)`);

if (notFound.length) {
  console.log(`\nNot found hotels:`);
  for (const o of notFound) {
    console.log(`  - ${o.name} (${o.country} / ${o.city})`);
  }
}

console.log(`\nSaved -> ${filePath}`);
console.log(`Cache -> ${CACHE_FILE}`);
