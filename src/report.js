#!/usr/bin/env node

/**
 * Generates a filtered CSV report from enriched data.
 * Filters by max price and min Google Maps rating.
 *
 * Usage:
 *   node src/report.js                            # price <= 12500, gmaps >= 4
 *   node src/report.js --price 15000              # price <= 15000, gmaps >= 4
 *   node src/report.js --gmaps 4.5                # price <= 12500, gmaps >= 4.5
 *   node src/report.js --price 15000 --gmaps 4.5  # both custom
 *
 * Requires: data/data.json (run "npm run enrich" first)
 * Output:   data/report.csv
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";

const DATA_FILE = "data/data.json";
const OUT_FILE = "data/report.csv";

// ── Parse CLI args ──────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let maxPrice = 12500;
  let minGmaps = 4;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--price" && args[i + 1]) {
      maxPrice = Number(args[++i]);
    } else if (args[i] === "--gmaps" && args[i + 1]) {
      minGmaps = Number(args[++i]);
    }
  }

  return { maxPrice, minGmaps };
}

// ── CSV helpers ─────────────────────────────────────────────

const CSV_COLUMNS = [
  "name", "country", "city",
  "duration", "departureDate", "returnDate",
  "ratingValue", "price", "pricePerPerson",
  "category", "serviceDesc", "tourOperator",
  "googleRating", "googleRatingsTotal", "googleMapsUrl",
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

const { maxPrice, minGmaps } = parseArgs();

console.log(`Filters: price <= ${maxPrice.toLocaleString("pl")} PLN, Google rating >= ${minGmaps}`);
console.log(`Input:   ${DATA_FILE}\n`);

let offers;
try {
  offers = JSON.parse(await readFile(DATA_FILE, "utf-8"));
} catch {
  console.error(`File not found: ${DATA_FILE}\nRun "npm run enrich" first.`);
  process.exit(1);
}

// Filter: price <= max AND googleRating >= min (skip nulls)
const filtered = offers
  .filter((o) =>
    o.googleRating != null &&
    o.googleRating >= minGmaps &&
    (o.price || Infinity) <= maxPrice
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
