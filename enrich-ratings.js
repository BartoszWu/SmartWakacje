#!/usr/bin/env node

/**
 * Enriches parsed offers JSON with Google Maps ratings.
 *
 * Usage:  node enrich-ratings.js [path/to/offers.json]
 *         If no path given, auto-detects newest data/offers_*.json
 *
 * Adds to each offer:
 *   googleRating        — Google Maps rating (0 if not found)
 *   googleRatingsTotal  — number of Google reviews (0 if not found)
 *   googleMapsUrl       — link to Google Maps place (null if not found)
 */

import https from "node:https";
import { readFile, writeFile, readdir } from "node:fs/promises";

// ── Config (loaded from .env) ───────────────────────────────
await loadEnv();
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY in .env");
  process.exit(1);
}
const DELAY_MS = 1000;
// ────────────────────────────────────────────────────────────

/**
 * Minimal .env loader — no external deps.
 * Reads .env from cwd, sets process.env for KEY=VALUE lines.
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

/**
 * Find the newest offers_*.json in data/
 */
async function findNewestOffers() {
  const files = await readdir("data");
  const offerFiles = files
    .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (!offerFiles.length) throw new Error("No offers_*.json found in data/");
  return `data/${offerFiles[0]}`;
}

/**
 * Normalize hotel name for better Google search results.
 * Strips parenthesized suffixes: "Long Beach (Avsallar)" → "Long Beach"
 */
function normalizeName(name) {
  return name.replace(/\s*\(.*?\)\s*/g, " ").trim();
}

/**
 * Map country names to English for Google query.
 */
const COUNTRY_EN = {
  Tunezja: "Tunisia",
  Turcja: "Turkey",
  Egipt: "Egypt",
  Grecja: "Greece",
  Hiszpania: "Spain",
  Chorwacja: "Croatia",
  Bułgaria: "Bulgaria",
  Cypr: "Cyprus",
  Maroko: "Morocco",
  Portugalia: "Portugal",
  Włochy: "Italy",
  Czarnogóra: "Montenegro",
  Albania: "Albania",
  Malta: "Malta",
};

/**
 * GET request via node:https (same pattern as scrape.js).
 */
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

/**
 * Fetch Google Maps rating for a hotel.
 * Returns { rating, totalRatings, mapsUrl } or defaults on failure.
 */
async function fetchGoogleRating(name, city, country) {
  const cleanName = normalizeName(name);
  const countryEn = COUNTRY_EN[country] || country || "";
  const query = `${cleanName} hotel ${city || ""} ${countryEn}`.trim();

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", GOOGLE_API_KEY);
  url.searchParams.set("type", "lodging");
  url.searchParams.set("language", "en");

  const data = await get(url.toString());

  if (data.status === "OK" && data.results.length > 0) {
    const r = data.results[0];
    return {
      rating: r.rating || 0,
      totalRatings: r.user_ratings_total || 0,
      mapsUrl: r.place_id
        ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}`
        : null,
    };
  }

  return { rating: 0, totalRatings: 0, mapsUrl: null };
}

// ── Main ────────────────────────────────────────────────────

const filePath = process.argv[2] || (await findNewestOffers());
console.log(`Enriching: ${filePath}\n`);

const offers = JSON.parse(await readFile(filePath, "utf-8"));
const total = offers.length;
let found = 0;
const notFound = [];

for (let i = 0; i < total; i++) {
  const o = offers[i];
  try {
    const g = await fetchGoogleRating(o.name, o.city, o.country);
    o.googleRating = g.rating;
    o.googleRatingsTotal = g.totalRatings;
    o.googleMapsUrl = g.mapsUrl;

    if (g.rating > 0) {
      found++;
      process.stdout.write(`  ${i + 1}/${total} ${o.name} -> ${g.rating} (${g.totalRatings})\n`);
    } else {
      notFound.push(o);
      process.stdout.write(`  ${i + 1}/${total} ${o.name} -> \u2717 not found\n`);
    }
  } catch (err) {
    o.googleRating = 0;
    o.googleRatingsTotal = 0;
    o.googleMapsUrl = null;
    notFound.push(o);
    process.stdout.write(`  ${i + 1}/${total} ${o.name} -> \u2717 error: ${err.message}\n`);
  }

  if (i < total - 1) await sleep(DELAY_MS);
}

await writeFile(filePath, JSON.stringify(offers, null, 2));

// ── Summary ─────────────────────────────────────────────────
console.log(`\n--- Done ---`);
console.log(`Total:     ${total}`);
console.log(`Found:     ${found} (${((found / total) * 100).toFixed(1)}%)`);
console.log(`Not found: ${notFound.length} (${((notFound.length / total) * 100).toFixed(1)}%)`);

if (notFound.length) {
  console.log(`\nNot found hotels:`);
  for (const o of notFound) {
    console.log(`  - ${o.name} (${o.country} / ${o.city})`);
  }
}

console.log(`\nSaved -> ${filePath}`);
