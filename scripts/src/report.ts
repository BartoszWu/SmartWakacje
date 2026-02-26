#!/usr/bin/env bun

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { reportConfig } from "../../config";
import type { Offer } from "@smartwakacje/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");
const SNAPSHOTS_DIR = join(DATA_DIR, "snapshots");

async function findDataFile(): Promise<string> {
  // First try latest snapshot
  try {
    const entries = await readdir(SNAPSHOTS_DIR, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse();
    if (dirs.length > 0) {
      const file = join(SNAPSHOTS_DIR, dirs[0], "offers.json");
      await readFile(file, "utf-8");
      return file;
    }
  } catch {
    // Continue
  }

  // Legacy fallback
  const legacyFile = join(DATA_DIR, "data.json");
  try {
    await readFile(legacyFile, "utf-8");
    return legacyFile;
  } catch {
    throw new Error(`No data found. Run "bun run scrape" or "bun run enrich" first.`);
  }
}

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

function resolveArg(): string | null {
  const arg = process.argv[2];
  if (!arg) return null;
  if (!arg.includes("/") && !arg.endsWith(".json")) {
    return join(SNAPSHOTS_DIR, arg, "offers.json");
  }
  return arg;
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

  const dataFile = resolveArg() || (await findDataFile());
  console.log(`Input:   ${dataFile}\n`);

  const offers: Offer[] = JSON.parse(await readFile(dataFile, "utf-8"));

  const filtered = offers
    .filter((o) =>
      o.googleRating != null &&
      o.googleRating >= minGmaps &&
      (o.price || Infinity) <= maxPrice &&
      (minTripAdvisor <= 0 || (o.taRating != null && o.taRating >= minTripAdvisor)) &&
      (minTrivago <= 0 || (o.trivagoRating != null && o.trivagoRating >= minTrivago))
    )
    .sort((a, b) => a.price - b.price);

  const outDir = dirname(dataFile);
  const outFile = join(outDir, "report.csv");
  await mkdir(outDir, { recursive: true });
  const csvRows = [
    CSV_COLUMNS.join(","),
    ...filtered.map((o) => CSV_COLUMNS.map((col) => escapeCsv((o as Record<string, unknown>)[col])).join(",")),
  ];
  await writeFile(outFile, "\uFEFF" + csvRows.join("\n"), "utf8");

  const uniqueHotels = new Set(filtered.map((o) => o.name)).size;
  const prices = filtered.map((o) => o.price).filter(Boolean);

  console.log(`--- Done ---`);
  console.log(`Matched:  ${filtered.length} offers (${uniqueHotels} hotels)`);
  if (prices.length) {
    console.log(`Price:    ${Math.min(...prices).toLocaleString("pl")} - ${Math.max(...prices).toLocaleString("pl")} PLN`);
  }
  console.log(`Saved:    ${outFile}`);
}

main().catch(console.error);
