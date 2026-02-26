#!/usr/bin/env bun

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Offer, GoogleCacheEntry, TACacheEntry, TrivagoCacheEntry } from "@smartwakacje/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");
const SNAPSHOTS_DIR = join(DATA_DIR, "snapshots");
const CACHE_DIR = join(DATA_DIR, "cache");

// Legacy cache locations (fallback)
const LEGACY_GOOGLE_CACHE = join(DATA_DIR, "google-ratings-cache.json");
const LEGACY_TA_CACHE = join(DATA_DIR, "ta-ratings-cache.json");
const LEGACY_TRIVAGO_CACHE = join(DATA_DIR, "trivago-ratings-cache.json");

async function findCacheFile(name: string): Promise<string> {
  const newPath = join(CACHE_DIR, `${name}.json`);
  const legacyPath = join(DATA_DIR, `${name}.json`);
  try {
    await readFile(newPath, "utf-8");
    return newPath;
  } catch {
    return legacyPath;
  }
}

async function findLatestSnapshot(): Promise<string | null> {
  try {
    const entries = await readdir(SNAPSHOTS_DIR, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse();
    if (dirs.length > 0) return join(SNAPSHOTS_DIR, dirs[0], "offers.json");
  } catch {
    // No snapshots dir
  }
  return null;
}

async function findNewestOffers(): Promise<string> {
  // First try snapshots
  const snapshotFile = await findLatestSnapshot();
  if (snapshotFile) {
    try {
      await readFile(snapshotFile, "utf-8");
      return snapshotFile;
    } catch {
      // Continue
    }
  }

  // Legacy fallback
  const files = await readdir(DATA_DIR);
  const offerFiles = files
    .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (!offerFiles.length) throw new Error("No offers found in data/ or data/snapshots/");
  return join(DATA_DIR, offerFiles[0]);
}

async function loadCache<T>(file: string): Promise<Record<string, T>> {
  try {
    return JSON.parse(await readFile(file, "utf-8"));
  } catch {
    return {};
  }
}

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_COLUMNS: string[] = [
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

function resolveArg(): string | null {
  const arg = process.argv[2];
  if (!arg) return null;
  // If it looks like a snapshot ID (no slashes, no .json), resolve to snapshot path
  if (!arg.includes("/") && !arg.endsWith(".json")) {
    return join(SNAPSHOTS_DIR, arg, "offers.json");
  }
  return arg;
}

async function main() {
  const filePath = resolveArg() || (await findNewestOffers());

  const googleCacheFile = await findCacheFile("google-ratings-cache");
  const taCacheFile = await findCacheFile("ta-ratings-cache");
  const trivagoCacheFile = await findCacheFile("trivago-ratings-cache");

  console.log(`Offers:        ${filePath}`);
  console.log(`Cache:         ${googleCacheFile}`);
  console.log(`TA Cache:      ${taCacheFile}`);
  console.log(`Trivago Cache: ${trivagoCacheFile}`);

  const offers: Offer[] = JSON.parse(await readFile(filePath, "utf-8"));
  const googleCache = await loadCache<GoogleCacheEntry>(googleCacheFile);
  const taCache = await loadCache<TACacheEntry>(taCacheFile);
  const trivagoCache = await loadCache<TrivagoCacheEntry>(trivagoCacheFile);

  const enrichedGoogle = new Set<string>();
  const enrichedTa = new Set<string>();
  const enrichedTrivago = new Set<string>();
  const missingHotels = new Set<string>();

  for (const o of offers) {
    const offer = o as Record<string, unknown>;
    
    const gEntry = googleCache[o.name];
    if (gEntry?.results?.length > 0) {
      const idx = gEntry.selected ?? 0;
      const r = gEntry.results[idx];
      offer.googleRating = r.rating || null;
      offer.googleRatingsTotal = r.totalRatings || null;
      offer.googleMapsUrl = r.mapsUrl || null;
      offer.googleAddress = r.address || null;
      offer.googlePlaceId = r.placeId || null;
      enrichedGoogle.add(o.name);
    } else {
      offer.googleRating = gEntry ? 0 : null;
      offer.googleRatingsTotal = gEntry ? 0 : null;
      offer.googleMapsUrl = null;
      offer.googleAddress = null;
      offer.googlePlaceId = null;
      if (!gEntry) missingHotels.add(o.name);
    }

    const taEntry = taCache[o.name];
    if (taEntry?.results?.length > 0 && taEntry.selected != null) {
      const r = taEntry.results[taEntry.selected];
      offer.taRating = r.rating ?? null;
      offer.taReviewCount = r.numReviews ?? null;
      offer.taUrl = r.taUrl || null;
      offer.taLocationId = r.locationId || null;
      enrichedTa.add(o.name);
    } else {
      offer.taRating = null;
      offer.taReviewCount = null;
      offer.taUrl = null;
      offer.taLocationId = null;
    }

    const trvEntry = trivagoCache[o.name];
    if (trvEntry?.results?.length > 0 && trvEntry.selected != null) {
      const r = trvEntry.results[trvEntry.selected];
      offer.trivagoRating = r.rating ?? null;
      offer.trivagoReviewsCount = r.reviewsCount ?? null;
      offer.trivagoUrl = r.trivagoUrl || null;
      offer.trivagoNsid = r.nsid || null;
      const asp = r.aspects ?? {};
      offer.trivagoAspectCleanliness = asp.cleanliness ?? null;
      offer.trivagoAspectLocation = asp.location ?? null;
      offer.trivagoAspectComfort = asp.comfort ?? null;
      offer.trivagoAspectValueForMoney = asp.valueForMoney ?? null;
      offer.trivagoAspectService = asp.service ?? null;
      offer.trivagoAspectFood = asp.food ?? null;
      offer.trivagoAspectRooms = asp.rooms ?? null;
      enrichedTrivago.add(o.name);
    } else {
      offer.trivagoRating = null;
      offer.trivagoReviewsCount = null;
      offer.trivagoUrl = null;
      offer.trivagoNsid = null;
      offer.trivagoAspectCleanliness = null;
      offer.trivagoAspectLocation = null;
      offer.trivagoAspectComfort = null;
      offer.trivagoAspectValueForMoney = null;
      offer.trivagoAspectService = null;
      offer.trivagoAspectFood = null;
      offer.trivagoAspectRooms = null;
    }
  }

  // Save enriched offers back to the same file (in-place update)
  await writeFile(filePath, JSON.stringify(offers, null, 2));

  // Also save CSV next to the offers file
  const dir = dirname(filePath);
  const csvRows = [
    CSV_COLUMNS.join(","),
    ...offers.map((o) => CSV_COLUMNS.map((col) => escapeCsv((o as Record<string, unknown>)[col])).join(",")),
  ];
  const csvFile = join(dir, "offers.csv");
  await writeFile(csvFile, "\uFEFF" + csvRows.join("\n"), "utf8");

  const uniqueHotels = new Set(offers.map((o) => o.name)).size;

  console.log(`\n--- Done ---`);
  console.log(`Offers:    ${offers.length}`);
  console.log(`Hotels:    ${uniqueHotels} unique`);
  console.log(`Google:    ${enrichedGoogle.size} hotels enriched`);
  console.log(`TA:        ${enrichedTa.size} hotels enriched`);
  console.log(`Trivago:   ${enrichedTrivago.size} hotels enriched`);
  console.log(`Missing:   ${missingHotels.size} hotels without any rating data`);
  console.log(`\nSaved:`);
  console.log(`  json -> ${filePath}`);
  console.log(`  csv  -> ${csvFile}`);
}

main().catch(console.error);
