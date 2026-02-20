#!/usr/bin/env node

/**
 * Fetches TripAdvisor ratings for hotels from offers JSON.
 * Only processes hotels with ratingValue >= 8.5 and price <= 14000.
 * Saves results to data/ta-ratings-cache.json (shared with server.js).
 * Does NOT modify the offers file — use enrich.js for that.
 *
 * Usage:  node src/fetch-ta-ratings.js [path/to/offers.json]
 *         If no path given, auto-detects newest data/offers_*.json
 */

import https from "node:https";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { config } from "../config.js";

// ── Config (loaded from .env) ───────────────────────────────
await loadEnv();
const TA_API_KEY = process.env.TRIPADVISOR_API_KEY;
if (!TA_API_KEY) {
  console.error("Missing TRIPADVISOR_API_KEY in .env");
  process.exit(1);
}
const ta = config.fetch.tripAdvisor ?? {};
const MIN_RATING = ta.minRating ?? config.fetch.minRating;
const MAX_PRICE = ta.maxPrice ?? config.fetch.maxPrice;
const BATCH_SIZE = ta.batchSize ?? config.fetch.batchSize;
const BATCH_DELAY_MS = ta.batchDelayMs ?? config.fetch.batchDelayMs;
const CACHE_FILE = "data/ta-ratings-cache.json";
// ────────────────────────────────────────────────────────────

/** Minimal .env loader — no external deps. */
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

/** Fetch details (rating, num_reviews, web_url) for a single location_id. */
async function fetchTaDetails(locationId) {
  const url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?key=${TA_API_KEY}&language=en`;
  const data = await get(url);
  return {
    rating: data.rating ? parseFloat(data.rating) : null,
    numReviews: data.num_reviews ? parseInt(data.num_reviews) : null,
    taUrl: data.web_url || null,
  };
}

/**
 * Fetch TripAdvisor rating — checks cache first, then API.
 * Fetches details only for top candidate; rest stored as stubs for UI selection.
 * Returns top result (or cache). Writes to cache.
 */
async function fetchTaRating(name, city, country, cache) {
  // Cache hit
  if (cache[name]?.results?.length > 0) {
    const idx = cache[name].selected ?? 0;
    const r = cache[name].results[idx];
    return { rating: r.rating, numReviews: r.numReviews, taUrl: r.taUrl, locationId: r.locationId, fromCache: true };
  }
  if (cache[name] && cache[name].results?.length === 0) {
    return { rating: null, numReviews: null, taUrl: null, locationId: null, fromCache: true };
  }

  // Search — get up to 5 candidates
  const cleanName = normalizeName(name);
  const countryEn = COUNTRY_EN[country] || country || "";
  const query = `${cleanName} ${city || ""} ${countryEn}`.trim();

  const searchUrl = new URL("https://api.content.tripadvisor.com/api/v1/location/search");
  searchUrl.searchParams.set("key", TA_API_KEY);
  searchUrl.searchParams.set("searchQuery", query);
  searchUrl.searchParams.set("category", "hotels");
  searchUrl.searchParams.set("language", "en");

  const searchData = await get(searchUrl.toString());
  const candidates = searchData.data?.slice(0, 5) || [];

  if (candidates.length === 0) {
    cache[name] = { results: [], selected: null, fetchedAt: new Date().toISOString() };
    return { rating: null, numReviews: null, taUrl: null, locationId: null, fromCache: false };
  }

  // Fetch details only for top candidate; others saved as stubs (name + address only)
  await sleep(BATCH_DELAY_MS);
  const topDetails = await fetchTaDetails(candidates[0].location_id);

  const results = candidates.map((loc, i) => {
    const base = {
      locationId: loc.location_id,
      name: loc.name || "",
      address: [loc.address_obj?.street1, loc.address_obj?.city, loc.address_obj?.country]
        .filter(Boolean).join(", "),
    };
    if (i === 0) return { ...base, rating: topDetails.rating, numReviews: topDetails.numReviews, taUrl: topDetails.taUrl };
    return base; // stub — details fetched on-demand via UI
  });

  cache[name] = { results, selected: 0, fetchedAt: new Date().toISOString() };
  const r = results[0];
  return { rating: r.rating, numReviews: r.numReviews, taUrl: r.taUrl, locationId: r.locationId, fromCache: false };
}

// ── Main ────────────────────────────────────────────────────

const filePath = process.argv[2] || (await findNewestOffers());
console.log(`Reading:   ${filePath}`);
console.log(`Filter:    ratingValue >= ${MIN_RATING}, price <= ${MAX_PRICE.toLocaleString("pl")} zl`);
console.log(`Batch:     ${BATCH_SIZE} parallel, ${BATCH_DELAY_MS}ms between batches\n`);

const offers = JSON.parse(await readFile(filePath, "utf-8"));
const cache = await loadCache();

// Deduplicate hotels matching filters
const seen = new Set();
const hotels = [];
for (const o of offers) {
  if (seen.has(o.name)) continue;
  seen.add(o.name);
  if ((o.ratingValue || 0) >= MIN_RATING && (o.price || 0) <= MAX_PRICE) hotels.push(o);
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
    try {
      const t = await fetchTaRating(h.name, h.city, h.country, cache);
      if (!t.fromCache) apiCalls++;

      completed++;
      const tag = t.fromCache ? "cache" : "api";
      if (t.rating != null) {
        found++;
        process.stdout.write(`  ${completed}/${hotels.length} ${h.name} -> ${t.rating} (${t.numReviews}) [${tag}]\n`);
      } else {
        notFound.push(h);
        process.stdout.write(`  ${completed}/${hotels.length} ${h.name} -> \u2717 not found [${tag}]\n`);
      }
    } catch (err) {
      notFound.push(h);
      completed++;
      process.stdout.write(`  ${completed}/${hotels.length} ${h.name} -> \u2717 error: ${err.message}\n`);
    }
  }));

  await saveCache(cache);
  if (b + BATCH_SIZE < hotels.length) await sleep(BATCH_DELAY_MS);
}

// ── Summary ─────────────────────────────────────────────────
console.log(`\n--- Done ---`);
console.log(`Hotels:    ${hotels.length}`);
console.log(`Found:     ${found} (${hotels.length ? ((found / hotels.length) * 100).toFixed(1) : 0}%)`);
console.log(`Not found: ${notFound.length}`);
console.log(`API calls: ${apiCalls} (${hotels.length - apiCalls} from cache)`);

if (notFound.length) {
  console.log(`\nNot found hotels:`);
  for (const o of notFound) {
    console.log(`  - ${o.name} (${o.country} / ${o.city})`);
  }
}

console.log(`\nCache -> ${CACHE_FILE}`);
