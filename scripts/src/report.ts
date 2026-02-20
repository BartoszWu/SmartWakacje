#!/usr/bin/env bun

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { reportConfig } from "../../config";
import type { Offer } from "@smartwakacje/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");
const DATA_FILE = join(DATA_DIR, "data.json");
const OUT_FILE = join(DATA_DIR, "report.csv");

const CSV_COLUMNS: string[] = [
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

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  const { maxPrice, minGmaps, minTripAdvisor = 0, minTrivago = 0 } = reportConfig;

  const filterDesc = [
    `price <= ${maxPrice.toLocaleString("pl")} PLN`,
    `Google >= ${minGmaps}`,
    ...(minTripAdvisor > 0 ? [`TripAdvisor >= ${minTripAdvisor}`] : []),
    ...(minTrivago > 0 ? [`Trivago >= ${minTrivago}`] : []),
  ].join(", ");
  console.log(`Filters: ${filterDesc}`);
  console.log(`Input:   ${DATA_FILE}\n`);

  let offers: Offer[];
  try {
    offers = JSON.parse(await readFile(DATA_FILE, "utf-8"));
  } catch {
    console.error(`File not found: ${DATA_FILE}\nRun "bun run enrich" first.`);
    process.exit(1);
  }

  const filtered = offers
    .filter((o) =>
      o.googleRating != null &&
      o.googleRating >= minGmaps &&
      (o.price || Infinity) <= maxPrice &&
      (minTripAdvisor <= 0 || (o.taRating != null && o.taRating >= minTripAdvisor)) &&
      (minTrivago <= 0 || (o.trivagoRating != null && o.trivagoRating >= minTrivago))
    )
    .sort((a, b) => a.price - b.price);

  await mkdir(DATA_DIR, { recursive: true });
  const csvRows = [
    CSV_COLUMNS.join(","),
    ...filtered.map((o) => CSV_COLUMNS.map((col) => escapeCsv((o as Record<string, unknown>)[col])).join(",")),
  ];
  await writeFile(OUT_FILE, "\uFEFF" + csvRows.join("\n"), "utf8");

  const uniqueHotels = new Set(filtered.map((o) => o.name)).size;
  const prices = filtered.map((o) => o.price).filter(Boolean);

  console.log(`--- Done ---`);
  console.log(`Matched:  ${filtered.length} offers (${uniqueHotels} hotels)`);
  if (prices.length) {
    console.log(`Price:    ${Math.min(...prices).toLocaleString("pl")} – ${Math.max(...prices).toLocaleString("pl")} PLN`);
  }
  console.log(`Saved:    ${OUT_FILE}`);
}

main().catch(console.error);
