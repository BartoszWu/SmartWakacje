#!/usr/bin/env node

/**
 * Generates a filtered CSV report from enriched data.
 * All filters are configured in config.js (report section).
 *
 * Usage:
 *   node src/report.js
 *
 * Requires: data/data.json (run "npm run enrich" first)
 * Output:   data/report.csv
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { config } from "../config.js";

const DATA_FILE = "data/data.json";
const OUT_FILE = "data/report.csv";

// ── CSV helpers ─────────────────────────────────────────────

const CSV_COLUMNS = [
  "name", "country", "city",
  "duration", "departureDate", "returnDate",
  "ratingValue", "price", "pricePerPerson",
  "category", "serviceDesc", "tourOperator",
  "googleRating", "googleRatingsTotal", "googleMapsUrl",
  "taRating", "taReviewCount", "taUrl",
  "trivagoRating", "trivagoReviewsCount", "trivagoUrl",
  "trivagoAspectCleanliness", "trivagoAspectLocation", "trivagoAspectComfort",
  "trivagoAspectValueForMoney", "trivagoAspectService", "trivagoAspectFood", "trivagoAspectRooms",
  "url",
];

function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ── Main ────────────────────────────────────────────────────

const { maxPrice, minGmaps, minTripAdvisor = 0, minTrivago = 0 } = config.report;

const filterDesc = [
  `price <= ${maxPrice.toLocaleString("pl")} PLN`,
  `Google >= ${minGmaps}`,
  ...(minTripAdvisor > 0 ? [`TripAdvisor >= ${minTripAdvisor}`] : []),
  ...(minTrivago > 0 ? [`Trivago >= ${minTrivago}`] : []),
].join(", ");
console.log(`Filters: ${filterDesc}`);
console.log(`Input:   ${DATA_FILE}\n`);

let offers;
try {
  offers = JSON.parse(await readFile(DATA_FILE, "utf-8"));
} catch {
  console.error(`File not found: ${DATA_FILE}\nRun "npm run enrich" first.`);
  process.exit(1);
}

// Filter: price + googleRating (required) + optional TA/Trivago minimums
const filtered = offers
  .filter((o) =>
    o.googleRating != null &&
    o.googleRating >= minGmaps &&
    (o.price || Infinity) <= maxPrice &&
    (minTripAdvisor <= 0 || (o.taRating != null && o.taRating >= minTripAdvisor)) &&
    (minTrivago <= 0 || (o.trivagoRating != null && o.trivagoRating >= minTrivago))
  )
  .sort((a, b) => a.price - b.price);

// Write CSV
await mkdir("data", { recursive: true });
const csvRows = [
  CSV_COLUMNS.join(","),
  ...filtered.map((o) => CSV_COLUMNS.map((col) => escapeCsv(o[col])).join(",")),
];
await writeFile(OUT_FILE, "\uFEFF" + csvRows.join("\n"), "utf8");

// Summary
const uniqueHotels = new Set(filtered.map((o) => o.name)).size;
const prices = filtered.map((o) => o.price).filter(Boolean);

console.log(`--- Done ---`);
console.log(`Matched:  ${filtered.length} offers (${uniqueHotels} hotels)`);
if (prices.length) {
  console.log(`Price:    ${Math.min(...prices).toLocaleString("pl")} – ${Math.max(...prices).toLocaleString("pl")} PLN`);
}
console.log(`Saved:    ${OUT_FILE}`);
