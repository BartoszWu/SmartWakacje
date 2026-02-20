#!/usr/bin/env bun

import https from "node:https";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchConfig } from "../../config";
import { normalizeName, COUNTRY_EN } from "@smartwakacje/shared";
import type { Offer, TACacheEntry, TASearchResult } from "@smartwakacje/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "..", "data");
const CACHE_FILE = join(DATA_DIR, "ta-ratings-cache.json");

const ta = fetchConfig.tripAdvisor ?? {};
const MIN_RATING = ta.minRating ?? fetchConfig.minRating;
const MAX_PRICE = ta.maxPrice ?? fetchConfig.maxPrice;
const BATCH_SIZE = ta.batchSize ?? fetchConfig.batchSize;
const BATCH_DELAY_MS = ta.batchDelayMs ?? fetchConfig.batchDelayMs;

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

async function loadCache(): Promise<Record<string, TACacheEntry>> {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

async function saveCache(cache: Record<string, TACacheEntry>): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

interface TADetails {
  rating: number | null;
  numReviews: number | null;
  taUrl: string | null;
}

async function fetchTaDetails(locationId: string): Promise<TADetails> {
  const url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?key=${process.env.TRIPADVISOR_API_KEY}&language=en`;
  const data = (await get(url)) as {
    rating?: string;
    num_reviews?: string;
    web_url?: string;
  };
  return {
    rating: data.rating ? parseFloat(data.rating) : null,
    numReviews: data.num_reviews ? parseInt(data.num_reviews) : null,
    taUrl: data.web_url || null,
  };
}

interface TARatingResult {
  rating: number | null;
  numReviews: number | null;
  taUrl: string | null;
  locationId: string | null;
  fromCache: boolean;
}

async function fetchTaRating(
  name: string,
  city: string,
  country: string,
  cache: Record<string, TACacheEntry>
): Promise<TARatingResult> {
  if (cache[name]?.results?.length > 0) {
    const idx = cache[name].selected ?? 0;
    const r = cache[name].results[idx];
    return { rating: r.rating, numReviews: r.numReviews, taUrl: r.taUrl, locationId: r.locationId, fromCache: true };
  }
  if (cache[name] && cache[name].results?.length === 0) {
    return { rating: null, numReviews: null, taUrl: null, locationId: null, fromCache: true };
  }

  const cleanName = normalizeName(name);
  const countryEn = COUNTRY_EN[country] || country || "";
  const query = `${cleanName} ${city || ""} ${countryEn}`.trim();

  const searchUrl = new URL("https://api.content.tripadvisor.com/api/v1/location/search");
  searchUrl.searchParams.set("key", process.env.TRIPADVISOR_API_KEY || "");
  searchUrl.searchParams.set("searchQuery", query);
  searchUrl.searchParams.set("category", "hotels");
  searchUrl.searchParams.set("language", "en");

  const searchData = (await get(searchUrl.toString())) as {
    data?: Array<{
      location_id: string;
      name?: string;
      address_obj?: {
        street1?: string;
        city?: string;
        country?: string;
      };
    }>;
  };
  const candidates = searchData.data?.slice(0, 5) || [];

  if (candidates.length === 0) {
    cache[name] = { results: [], selected: null, fetchedAt: new Date().toISOString() };
    return { rating: null, numReviews: null, taUrl: null, locationId: null, fromCache: false };
  }

  await sleep(BATCH_DELAY_MS);
  const topDetails = await fetchTaDetails(candidates[0].location_id);

  const results: TASearchResult[] = candidates.map((loc, i) => {
    const base: TASearchResult = {
      locationId: loc.location_id,
      name: loc.name || "",
      address: [loc.address_obj?.street1, loc.address_obj?.city, loc.address_obj?.country]
        .filter(Boolean)
        .join(", "),
      rating: null,
      numReviews: null,
      taUrl: null,
    };
    if (i === 0) {
      return { ...base, rating: topDetails.rating, numReviews: topDetails.numReviews, taUrl: topDetails.taUrl };
    }
    return base;
  });

  cache[name] = { results, selected: 0, fetchedAt: new Date().toISOString() };
  const r = results[0];
  return { rating: r.rating, numReviews: r.numReviews, taUrl: r.taUrl, locationId: r.locationId, fromCache: false };
}

async function main() {
  await loadEnv();
  const TA_API_KEY = process.env.TRIPADVISOR_API_KEY;
  if (!TA_API_KEY) {
    console.error("Missing TRIPADVISOR_API_KEY in .env");
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
          const t = await fetchTaRating(h.name, h.city, h.country, cache);
          if (!t.fromCache) apiCalls++;

          completed++;
          const tag = t.fromCache ? "cache" : "api";
          if (t.rating != null) {
            found++;
            process.stdout.write(`  ${completed}/${hotels.length} ${h.name} -> ${t.rating} (${t.numReviews}) [${tag}]\n`);
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
}

main().catch(console.error);
