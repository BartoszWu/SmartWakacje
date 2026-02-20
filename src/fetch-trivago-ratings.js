#!/usr/bin/env node

/**
 * Fetches Trivago ratings for hotels from offers JSON.
 * Uses Trivago's reverse-engineered GraphQL API (search) + SSR __NEXT_DATA__ (ratings).
 * No API key required — scrapes public data.
 *
 * Flow per hotel:
 *   1. POST /graphql?getSearchSuggestions → get nsid (hotel ID)
 *   2. GET /pl/oar/hotel?search=100-{nsid} → follow 301 → parse __NEXT_DATA__
 *      → accommodationDetails.reviewRating (overall)
 *      → accommodationRatings.aspectRatings (cleanliness, location, etc.)
 *
 * Usage:  node src/fetch-trivago-ratings.js [path/to/offers.json]
 *         If no path given, auto-detects newest data/offers_*.json
 */

import https from "node:https";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { config } from "../config.js";

// ── Config ───────────────────────────────────────────────────
const trv = config.fetch.trivago ?? {};
const MIN_RATING = trv.minRating ?? config.fetch.minRating;
const MAX_PRICE = trv.maxPrice ?? config.fetch.maxPrice;
const BATCH_SIZE = trv.batchSize ?? config.fetch.batchSize;
const BATCH_DELAY_MS = trv.batchDelayMs ?? config.fetch.batchDelayMs;
const CACHE_FILE = "data/trivago-ratings-cache.json";

// Trivago GraphQL persisted query hash for getSearchSuggestions
const SEARCH_HASH = "ea6de51e563394c4768a3a0ef0f67e7307c910ed29e4824896f36c95d5d159fd";
// ────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findNewestOffers() {
  const files = await readdir("data");
  const offerFiles = files
    .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (!offerFiles.length) throw new Error("No offers_*.json found in data/");
  return `data/${offerFiles[0]}`;
}

function normalizeName(name) {
  return name.replace(/\s*\(.*?\)\s*/g, " ").trim();
}

async function loadCache() {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await mkdir("data", { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/** POST to Trivago GraphQL endpoint, returns parsed JSON. */
function trivagoPost(path, body) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const req = https.request(
      {
        hostname: "www.trivago.pl",
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": payload.length,
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
          "Origin": "https://www.trivago.pl",
          "Referer": "https://www.trivago.pl/",
          "apollographql-client-name": "hs-web-app",
          "apollographql-client-version": "cafd1354",
          "x-trv-app-id": "HS_WEB_APP_WARP",
          "x-trv-language": "pl",
          "x-trv-platform": "pl",
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          if (res.statusCode !== 200)
            return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          try { resolve(JSON.parse(raw)); }
          catch { reject(new Error(`Invalid JSON: ${raw.slice(0, 200)}`)); }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

/**
 * GET Trivago hotel page, following 301/302 redirect if needed.
 * Returns the raw HTML string.
 */
function trivagoGet(path) {
  return new Promise((resolve, reject) => {
    function doGet(p) {
      https
        .get(
          {
            hostname: "www.trivago.pl",
            path: p,
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml",
              "Accept-Language": "pl-PL,pl;q=0.9",
            },
          },
          (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
              const loc = res.headers["location"];
              if (!loc) return reject(new Error("Redirect without Location header"));
              res.resume(); // drain response body
              try {
                const u = new URL(loc);
                doGet(u.pathname + u.search);
              } catch {
                reject(new Error(`Bad redirect URL: ${loc}`));
              }
              return;
            }
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => resolve(Buffer.concat(chunks).toString()));
          }
        )
        .on("error", reject);
    }
    doGet(path);
  });
}

/**
 * Search Trivago for hotel by name.
 * Returns first concept with ns=100 (hotel nsid), or null.
 */
async function searchTrivago(name) {
  const clean = normalizeName(name);
  const data = await trivagoPost("/graphql?getSearchSuggestions", {
    variables: {
      input: {
        query: clean,
        spellingCorrection: true,
        previousQueries: [],
        enableAlternativeSuggestions: false,
      },
    },
    operationName: "getSearchSuggestions",
    extensions: {
      persistedQuery: { version: 1, sha256Hash: SEARCH_HASH },
    },
  });

  const suggestions = data?.data?.getSearchSuggestions?.unifiedSearchSuggestions ?? [];
  for (const s of suggestions) {
    const c = s.concept;
    if (c?.nsid?.ns === 100) {
      return {
        nsid: c.nsid.id,
        name: c.translatedName?.value ?? "",
        locationLabel: c.locationLabel ?? "",
      };
    }
  }
  return null;
}

// Maps Polish aspect names from Trivago to English field keys
const ASPECT_MAP = {
  "Czystość": "cleanliness",
  "Lokalizacja": "location",
  "Komfort": "comfort",
  "Jakość a cena": "valueForMoney",
  "Obsługa": "service",
  "Jedzenie": "food",
  "Pokoje": "rooms",
};

/**
 * Fetch hotel ratings by nsid from SSR __NEXT_DATA__.
 * Returns { rating, reviewsCount, trivago_url, aspects } or throws.
 */
async function fetchTrivagoRatings(nsid) {
  const html = await trivagoGet(`/pl/oar/hotel?search=100-${nsid}`);

  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("No __NEXT_DATA__ found on page");

  const queries = JSON.parse(m[1])?.props?.pageProps?.initialState?.gqlApi?.queries ?? {};

  // Overall rating from accommodationDetails
  const detKey = Object.keys(queries).find((k) => k.startsWith("accommodationDetails("));
  const detEntry = detKey ? queries[detKey]?.data?.[0]?.[1] : null;
  const reviewRating = detEntry?.reviewRating ?? null;

  // Aspect ratings from accommodationRatings
  const ratKey = Object.keys(queries).find((k) => k.startsWith("accommodationRatings("));
  const ratEntry = ratKey ? queries[ratKey]?.data?.[0]?.[1] : null;
  const aspectRatings = ratEntry?.aspectRatings ?? [];

  const aspects = {};
  for (const ar of aspectRatings) {
    const key = ASPECT_MAP[ar.translatedName?.value];
    if (key) aspects[key] = Math.round((ar.value / 1000) * 10) / 10;
  }

  const urlSlug = detEntry?.userFriendlyUrl?.url ?? null;
  const trivago_url = urlSlug
    ? `https://www.trivago.pl${urlSlug}`
    : `https://www.trivago.pl/pl/oar/hotel?search=100-${nsid}`;

  return {
    rating: reviewRating ? parseFloat(reviewRating.formattedRating) : null,
    reviewsCount: reviewRating?.reviewsCount ?? null,
    trivago_url,
    aspects: Object.keys(aspects).length > 0 ? aspects : null,
  };
}

/** Fetch Trivago rating for a hotel — cache-first. */
async function fetchTrivagoRating(name, cache) {
  // Cache hit (including empty-result cache)
  if (cache[name]?.results?.length > 0) {
    const idx = cache[name].selected ?? 0;
    return { ...cache[name].results[idx], fromCache: true };
  }
  if (cache[name] && cache[name].results?.length === 0) {
    return { rating: null, reviewsCount: null, trivago_url: null, aspects: null, fromCache: true };
  }

  // Step 1: search by name → nsid
  const concept = await searchTrivago(name);
  if (!concept) {
    cache[name] = { results: [], selected: null, fetchedAt: new Date().toISOString() };
    return { rating: null, reviewsCount: null, trivago_url: null, aspects: null, fromCache: false };
  }

  // Step 2: fetch SSR page for ratings
  const ratings = await fetchTrivagoRatings(concept.nsid);

  const result = {
    nsid: concept.nsid,
    name: concept.name,
    locationLabel: concept.locationLabel,
    rating: ratings.rating,
    reviewsCount: ratings.reviewsCount,
    trivago_url: ratings.trivago_url,
    aspects: ratings.aspects,
  };

  cache[name] = { results: [result], selected: 0, fetchedAt: new Date().toISOString() };
  return { ...result, fromCache: false };
}

// ── Main ────────────────────────────────────────────────────

const filePath = process.argv[2] || (await findNewestOffers());
console.log(`Reading:   ${filePath}`);
console.log(`Filter:    ratingValue >= ${MIN_RATING}, price <= ${MAX_PRICE.toLocaleString("pl")} zl`);
console.log(`Batch:     ${BATCH_SIZE} parallel, ${BATCH_DELAY_MS}ms between batches\n`);

const offers = JSON.parse(await readFile(filePath, "utf-8"));
const cache = await loadCache();

// Deduplicate hotels matching filters
const seen = new Set();
const hotels = [];
for (const o of offers) {
  if (seen.has(o.name)) continue;
  seen.add(o.name);
  if ((o.ratingValue || 0) >= MIN_RATING && (o.price || 0) <= MAX_PRICE) hotels.push(o);
}

console.log(`Unique hotels matching filters: ${hotels.length}\n`);

let found = 0;
let apiCalls = 0;
const notFound = [];
let completed = 0;

for (let b = 0; b < hotels.length; b += BATCH_SIZE) {
  const batch = hotels.slice(b, b + BATCH_SIZE);

  await Promise.all(
    batch.map(async (h) => {
      try {
        const t = await fetchTrivagoRating(h.name, cache);
        if (!t.fromCache) apiCalls++;

        completed++;
        const tag = t.fromCache ? "cache" : "api";
        if (t.rating != null) {
          found++;
          process.stdout.write(
            `  ${completed}/${hotels.length} ${h.name} -> ${t.rating} (${t.reviewsCount}) [${tag}]\n`
          );
        } else {
          notFound.push(h);
          process.stdout.write(
            `  ${completed}/${hotels.length} ${h.name} -> \u2717 not found [${tag}]\n`
          );
        }
      } catch (err) {
        notFound.push(h);
        completed++;
        process.stdout.write(
          `  ${completed}/${hotels.length} ${h.name} -> \u2717 error: ${err.message}\n`
        );
      }
    })
  );

  await saveCache(cache);
  if (b + BATCH_SIZE < hotels.length) await sleep(BATCH_DELAY_MS);
}


// ── Summary ─────────────────────────────────────────────────
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
