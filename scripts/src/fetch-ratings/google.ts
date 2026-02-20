#!/usr/bin/env bun

import https from "node:https";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchConfig } from "../../config";
import { normalizeName, COUNTRY_EN } from "@smartwakacje/shared";
import type { Offer, GoogleCacheEntry, GoogleSearchResult } from "@smartwakacje/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");
const CACHE_FILE = join(DATA_DIR, "google-ratings-cache.json");

const gmaps = fetchConfig.googleMaps ?? {};
const MIN_RATING = gmaps.minRating ?? fetchConfig.minRating;
const MAX_PRICE = gmaps.maxPrice ?? fetchConfig.maxPrice;
const BATCH_SIZE = gmaps.batchSize ?? fetchConfig.batchSize;
const BATCH_DELAY_MS = gmaps.batchDelayMs ?? fetchConfig.batchDelayMs;

async function loadEnv(): Promise<void> {
  try {
    const txt = await readFile(join(__dirname, "..", "..", "..", ".env"), "utf-8");
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
    // .env not found
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function findNewestOffers(): Promise<string> {
  const files = await readdir(DATA_DIR);
  const offerFiles = files
    .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (!offerFiles.length) throw new Error("No offers_*.json found in data/");
  return join(DATA_DIR, offerFiles[0]);
}

function get(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: Buffer[] = [];
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

async function loadCache(): Promise<Record<string, GoogleCacheEntry>> {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

async function saveCache(cache: Record<string, GoogleCacheEntry>): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

interface GoogleRatingResult {
  rating: number;
  totalRatings: number;
  mapsUrl: string | null;
  fromCache: boolean;
}

async function fetchGoogleRating(
  name: string,
  city: string,
  country: string,
  cache: Record<string, GoogleCacheEntry>
): Promise<GoogleRatingResult> {
  if (cache[name]?.results?.length > 0) {
    const idx = cache[name].selected ?? 0;
    const r = cache[name].results[idx];
    return { rating: r.rating, totalRatings: r.totalRatings, mapsUrl: r.mapsUrl, fromCache: true };
  }
  if (cache[name] && cache[name].results?.length === 0) {
    return { rating: 0, totalRatings: 0, mapsUrl: null, fromCache: true };
  }

  const cleanName = normalizeName(name);
  const countryEn = COUNTRY_EN[country] || country || "";
  const query = `${cleanName} hotel ${city || ""} ${countryEn}`.trim();

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY || "");
  url.searchParams.set("type", "lodging");
  url.searchParams.set("language", "en");

  const data = (await get(url.toString())) as {
    status: string;
    results: Array<{
      name?: string;
      rating?: number;
      user_ratings_total?: number;
      formatted_address?: string;
      place_id?: string;
    }>;
  };

  if (data.status === "OK" && data.results?.length > 0) {
    const results: GoogleSearchResult[] = data.results.slice(0, 5).map((r) => ({
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

async function main() {
  await loadEnv();
  const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!GOOGLE_API_KEY) {
    console.error("Missing GOOGLE_MAPS_API_KEY in .env");
    process.exit(1);
  }

  const filePath = process.argv[2] || (await findNewestOffers());
  console.log(`Reading:   ${filePath}`);
  console.log(`Filter:    ratingValue >= ${MIN_RATING}, price <= ${MAX_PRICE.toLocaleString("pl")} zl`);
  console.log(`Batch:     ${BATCH_SIZE} parallel, ${BATCH_DELAY_MS}ms between batches\n`);

  const offers: Offer[] = JSON.parse(await readFile(filePath, "utf-8"));
  const cache = await loadCache();

  const seen = new Set<string>();
  const hotels: Offer[] = [];
  for (const o of offers) {
    if (seen.has(o.name)) continue;
    seen.add(o.name);
    if ((o.ratingValue || 0) >= MIN_RATING && (o.price || 0) <= MAX_PRICE) hotels.push(o);
  }

  console.log(`Unique hotels matching filters: ${hotels.length}\n`);

  let found = 0;
  let apiCalls = 0;
  const notFound: Offer[] = [];
  let completed = 0;

  for (let b = 0; b < hotels.length; b += BATCH_SIZE) {
    const batch = hotels.slice(b, b + BATCH_SIZE);

    await Promise.all(
      batch.map(async (h) => {
        try {
          const g = await fetchGoogleRating(h.name, h.city, h.country, cache);
          if (!g.fromCache) apiCalls++;

          completed++;
          const tag = g.fromCache ? "cache" : "api";
          if (g.rating > 0) {
            found++;
            process.stdout.write(`  ${completed}/${hotels.length} ${h.name} -> ${g.rating} (${g.totalRatings}) [${tag}]\n`);
          } else {
            notFound.push(h);
            process.stdout.write(`  ${completed}/${hotels.length} ${h.name} -> ✗ not found [${tag}]\n`);
          }
        } catch (err) {
          notFound.push(h);
          completed++;
          process.stdout.write(`  ${completed}/${hotels.length} ${h.name} -> ✗ error: ${(err as Error).message}\n`);
        }
      })
    );

    await saveCache(cache);
    if (b + BATCH_SIZE < hotels.length) await sleep(BATCH_DELAY_MS);
  }

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

  console.log(`\nCache -> ${CACHE_FILE}`);
}

main().catch(console.error);
