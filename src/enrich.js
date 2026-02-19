#!/usr/bin/env node

/**
 * Merges offers JSON with Google ratings cache into final enriched files.
 * All 1900 offers included — hotels without Google data get null fields.
 *
 * Usage:  node src/enrich.js [path/to/offers.json]
 *         If no path given, auto-detects newest data/offers_*.json
 *
 * Output:
 *   data/final_<from>_<to>.json — enriched offers with Google data
 *   data/final_<from>_<to>.csv  — same as flat CSV (UTF-8 BOM)
 */

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";

const CACHE_FILE = "data/google-ratings-cache.json";

async function findNewestOffers() {
  const files = await readdir("data");
  const offerFiles = files
    .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (!offerFiles.length) throw new Error("No offers_*.json found in data/");
  return `data/${offerFiles[0]}`;
}

async function loadCache() {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

/** Extract date range from filename like "offers_2026-06-19_2026-06-30.json" */
function extractDates(filePath) {
  const m = filePath.match(/offers_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/);
  return m ? { from: m[1], to: m[2] } : { from: "unknown", to: "unknown" };
}

function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_COLUMNS = [
  "name", "country", "region", "city",
  "duration", "departureDate", "returnDate",
  "ratingValue", "ratingRecommends", "ratingReservationCount",
  "price", "pricePerPerson", "priceOld", "priceDiscount",
  "category", "serviceDesc", "tourOperator",
  "departurePlace", "departureTypeName",
  "promoLastMinute", "promoFirstMinute", "employeeRatingCount",
  "googleRating", "googleRatingsTotal", "googleMapsUrl", "googleAddress", "googlePlaceId",
  "url", "photo",
];

// ── Main ────────────────────────────────────────────────────

const filePath = process.argv[2] || (await findNewestOffers());
const { from, to } = extractDates(filePath);

console.log(`Offers:  ${filePath}`);
console.log(`Cache:   ${CACHE_FILE}`);

const offers = JSON.parse(await readFile(filePath, "utf-8"));
const cache = await loadCache();

const enrichedHotels = new Set();
const missingHotels = new Set();

for (const o of offers) {
  const entry = cache[o.name];
  if (entry?.results?.length > 0) {
    const idx = entry.selected ?? 0;
    const r = entry.results[idx];
    o.googleRating = r.rating || null;
    o.googleRatingsTotal = r.totalRatings || null;
    o.googleMapsUrl = r.mapsUrl || null;
    o.googleAddress = r.address || null;
    o.googlePlaceId = r.placeId || null;
    enrichedHotels.add(o.name);
  } else if (entry && entry.results?.length === 0) {
    // Searched but not found in Google
    o.googleRating = 0;
    o.googleRatingsTotal = 0;
    o.googleMapsUrl = null;
    o.googleAddress = null;
    o.googlePlaceId = null;
    missingHotels.add(o.name);
  } else {
    // Not in cache — never searched
    o.googleRating = null;
    o.googleRatingsTotal = null;
    o.googleMapsUrl = null;
    o.googleAddress = null;
    o.googlePlaceId = null;
    missingHotels.add(o.name);
  }
}

await mkdir("data", { recursive: true });

// JSON
const jsonFile = "data/data.json";
await writeFile(jsonFile, JSON.stringify(offers, null, 2));

// CSV
const csvRows = [
  CSV_COLUMNS.join(","),
  ...offers.map((o) => CSV_COLUMNS.map((col) => escapeCsv(o[col])).join(",")),
];
const csvFile = "data/data.csv";
await writeFile(csvFile, "\uFEFF" + csvRows.join("\n"), "utf8");

// ── Summary ─────────────────────────────────────────────────
const uniqueHotels = new Set(offers.map((o) => o.name)).size;

console.log(`\n--- Done ---`);
console.log(`Offers:    ${offers.length}`);
console.log(`Hotels:    ${uniqueHotels} unique`);
console.log(`Enriched:  ${enrichedHotels.size} hotels with Google data`);
console.log(`Missing:   ${missingHotels.size} hotels without Google data`);
console.log(`\nSaved:`);
console.log(`  json -> ${jsonFile}`);
console.log(`  csv  -> ${csvFile}`);
