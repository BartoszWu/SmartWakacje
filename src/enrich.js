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
const TA_CACHE_FILE = "data/ta-ratings-cache.json";
const TRIVAGO_CACHE_FILE = "data/trivago-ratings-cache.json";

async function findNewestOffers() {
  const files = await readdir("data");
  const offerFiles = files
    .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (!offerFiles.length) throw new Error("No offers_*.json found in data/");
  return `data/${offerFiles[0]}`;
}

async function loadCache(file) {
  try {
    return JSON.parse(await readFile(file, "utf-8"));
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
  "taRating", "taReviewCount", "taUrl", "taLocationId",
  "trivagoRating", "trivagoReviewsCount", "trivagoUrl", "trivagoNsid",
  "trivagoAspectCleanliness", "trivagoAspectLocation", "trivagoAspectComfort",
  "trivagoAspectValueForMoney", "trivagoAspectService", "trivagoAspectFood", "trivagoAspectRooms",
  "url", "photo",
];

// ── Main ────────────────────────────────────────────────────

const filePath = process.argv[2] || (await findNewestOffers());
const { from, to } = extractDates(filePath);

console.log(`Offers:        ${filePath}`);
console.log(`Cache:         ${CACHE_FILE}`);
console.log(`TA Cache:      ${TA_CACHE_FILE}`);
console.log(`Trivago Cache: ${TRIVAGO_CACHE_FILE}`);

const offers = JSON.parse(await readFile(filePath, "utf-8"));
const cache = await loadCache(CACHE_FILE);
const taCache = await loadCache(TA_CACHE_FILE);
const trivagoCache = await loadCache(TRIVAGO_CACHE_FILE);

const enrichedGoogle = new Set();
const enrichedTa = new Set();
const enrichedTrivago = new Set();
const missingHotels = new Set();

for (const o of offers) {
  // ── Google ───────────────────────────────────────────────
  const gEntry = cache[o.name];
  if (gEntry?.results?.length > 0) {
    const idx = gEntry.selected ?? 0;
    const r = gEntry.results[idx];
    o.googleRating = r.rating || null;
    o.googleRatingsTotal = r.totalRatings || null;
    o.googleMapsUrl = r.mapsUrl || null;
    o.googleAddress = r.address || null;
    o.googlePlaceId = r.placeId || null;
    enrichedGoogle.add(o.name);
  } else {
    o.googleRating = gEntry ? 0 : null;
    o.googleRatingsTotal = gEntry ? 0 : null;
    o.googleMapsUrl = null;
    o.googleAddress = null;
    o.googlePlaceId = null;
    if (!gEntry) missingHotels.add(o.name);
  }

  // ── TripAdvisor ──────────────────────────────────────────
  const taEntry = taCache[o.name];
  if (taEntry?.results?.length > 0 && taEntry.selected != null) {
    const r = taEntry.results[taEntry.selected];
    o.taRating = r.rating ?? null;
    o.taReviewCount = r.numReviews ?? null;
    o.taUrl = r.taUrl || null;
    o.taLocationId = r.locationId || null;
    enrichedTa.add(o.name);
  } else {
    o.taRating = null;
    o.taReviewCount = null;
    o.taUrl = null;
    o.taLocationId = null;
  }

  // ── Trivago ───────────────────────────────────────────────
  const trvEntry = trivagoCache[o.name];
  if (trvEntry?.results?.length > 0 && trvEntry.selected != null) {
    const r = trvEntry.results[trvEntry.selected];
    o.trivagoRating = r.rating ?? null;
    o.trivagoReviewsCount = r.reviewsCount ?? null;
    o.trivagoUrl = r.trivago_url || null;
    o.trivagoNsid = r.nsid || null;
    const asp = r.aspects ?? {};
    o.trivagoAspectCleanliness = asp.cleanliness ?? null;
    o.trivagoAspectLocation = asp.location ?? null;
    o.trivagoAspectComfort = asp.comfort ?? null;
    o.trivagoAspectValueForMoney = asp.valueForMoney ?? null;
    o.trivagoAspectService = asp.service ?? null;
    o.trivagoAspectFood = asp.food ?? null;
    o.trivagoAspectRooms = asp.rooms ?? null;
    enrichedTrivago.add(o.name);
  } else {
    o.trivagoRating = null;
    o.trivagoReviewsCount = null;
    o.trivagoUrl = null;
    o.trivagoNsid = null;
    o.trivagoAspectCleanliness = null;
    o.trivagoAspectLocation = null;
    o.trivagoAspectComfort = null;
    o.trivagoAspectValueForMoney = null;
    o.trivagoAspectService = null;
    o.trivagoAspectFood = null;
    o.trivagoAspectRooms = null;
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
console.log(`Google:    ${enrichedGoogle.size} hotels enriched`);
console.log(`TA:        ${enrichedTa.size} hotels enriched`);
console.log(`Trivago:   ${enrichedTrivago.size} hotels enriched`);
console.log(`Missing:   ${missingHotels.size} hotels without any rating data`);
console.log(`\nSaved:`);
console.log(`  json -> ${jsonFile}`);
console.log(`  csv  -> ${csvFile}`);
