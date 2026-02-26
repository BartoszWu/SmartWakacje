#!/usr/bin/env bun

import https from "node:https";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchConfig } from "../../config";
import { normalizeName } from "@smartwakacje/shared";
import type { Offer, TrivagoCacheEntry, TrivagoSearchResult, TrivagoAspects } from "@smartwakacje/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "..", "data");
const CACHE_DIR = join(DATA_DIR, "cache");
const SNAPSHOTS_DIR = join(DATA_DIR, "snapshots");
const CACHE_FILE = join(CACHE_DIR, "trivago-ratings-cache.json");
const LEGACY_CACHE_FILE = join(DATA_DIR, "trivago-ratings-cache.json");

const trv = fetchConfig.trivago ?? {};
const MIN_RATING = trv.minRating ?? fetchConfig.minRating;
const MAX_PRICE = trv.maxPrice ?? fetchConfig.maxPrice;
const BATCH_SIZE = trv.batchSize ?? fetchConfig.batchSize;
const BATCH_DELAY_MS = trv.batchDelayMs ?? fetchConfig.batchDelayMs;

const SEARCH_HASH = "ea6de51e563394c4768a3a0ef0f67e7307c910ed29e4824896f36c95d5d159fd";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function findNewestOffers(): Promise<string> {
  // Try snapshots first
  try {
    const entries = await readdir(SNAPSHOTS_DIR, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().reverse();
    if (dirs.length > 0) {
      const file = join(SNAPSHOTS_DIR, dirs[0], "offers.json");
      await readFile(file, "utf-8");
      return file;
    }
  } catch { /* Continue */ }

  const files = await readdir(DATA_DIR);
  const offerFiles = files
    .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (!offerFiles.length) throw new Error("No offers found in data/ or data/snapshots/");
  return join(DATA_DIR, offerFiles[0]);
}

async function loadCache(): Promise<Record<string, TrivagoCacheEntry>> {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf-8"));
  } catch {
    try {
      return JSON.parse(await readFile(LEGACY_CACHE_FILE, "utf-8"));
    } catch {
      return {};
    }
  }
}

async function saveCache(cache: Record<string, TrivagoCacheEntry>): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function trivagoPost(path: string, body: unknown): Promise<unknown> {
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
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
          Origin: "https://www.trivago.pl",
          Referer: "https://www.trivago.pl/",
          "apollographql-client-name": "hs-web-app",
          "apollographql-client-version": "cafd1354",
          "x-trv-app-id": "HS_WEB_APP_WARP",
          "x-trv-language": "pl",
          "x-trv-platform": "pl",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          if (res.statusCode !== 200)
            return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error(`Invalid JSON: ${raw.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function trivagoGet(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    function doGet(p: string) {
      https
        .get(
          {
            hostname: "www.trivago.pl",
            path: p,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml",
              "Accept-Language": "pl-PL,pl;q=0.9",
            },
          },
          (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
              const loc = res.headers["location"];
              if (!loc) return reject(new Error("Redirect without Location header"));
              res.resume();
              try {
                const u = new URL(loc);
                doGet(u.pathname + u.search);
              } catch {
                reject(new Error(`Bad redirect URL: ${loc}`));
              }
              return;
            }
            const chunks: Buffer[] = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => resolve(Buffer.concat(chunks).toString()));
          }
        )
        .on("error", reject);
    }
    doGet(path);
  });
}

interface TrivagoConcept {
  nsid: number;
  name: string;
  locationLabel: string;
}

async function searchTrivago(name: string): Promise<TrivagoConcept | null> {
  const clean = normalizeName(name);
  const data = (await trivagoPost("/graphql?getSearchSuggestions", {
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
  })) as {
    data?: {
      getSearchSuggestions?: {
        unifiedSearchSuggestions?: Array<{
          concept?: {
            nsid?: { ns?: number; id?: number };
            translatedName?: { value?: string };
            locationLabel?: string;
          };
        }>;
      };
    };
  };

  const suggestions = data?.data?.getSearchSuggestions?.unifiedSearchSuggestions ?? [];
  for (const s of suggestions) {
    const c = s.concept;
    if (c?.nsid?.ns === 100) {
      return {
        nsid: c.nsid.id as number,
        name: c.translatedName?.value ?? "",
        locationLabel: c.locationLabel ?? "",
      };
    }
  }
  return null;
}

const ASPECT_MAP: Record<string, keyof TrivagoAspects> = {
  Czystość: "cleanliness",
  Lokalizacja: "location",
  Komfort: "comfort",
  "Jakość a cena": "valueForMoney",
  Obsługa: "service",
  Jedzenie: "food",
  Pokoje: "rooms",
};

interface TrivagoRatings {
  rating: number | null;
  reviewsCount: number | null;
  trivago_url: string;
  aspects: TrivagoAspects | null;
}

async function fetchTrivagoRatings(nsid: number): Promise<TrivagoRatings> {
  const html = await trivagoGet(`/pl/oar/hotel?search=100-${nsid}`);

  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("No __NEXT_DATA__ found on page");

  const parsed = JSON.parse(m[1]) as {
    props?: {
      pageProps?: {
        initialState?: {
          gqlApi?: {
            queries?: Record<string, unknown>;
          };
        };
      };
    };
  };

  const queries = parsed?.props?.pageProps?.initialState?.gqlApi?.queries ?? {};

  const detKey = Object.keys(queries).find((k) => k.startsWith("accommodationDetails("));
  const detEntry = detKey
    ? ((queries[detKey] as { data?: unknown[][] })?.data?.[0]?.[1] as {
        reviewRating?: { formattedRating?: string; reviewsCount?: number };
        userFriendlyUrl?: { url?: string };
      } | null)
    : null;
  const reviewRating = detEntry?.reviewRating ?? null;

  const ratKey = Object.keys(queries).find((k) => k.startsWith("accommodationRatings("));
  const ratEntry = ratKey
    ? ((queries[ratKey] as { data?: unknown[][] })?.data?.[0]?.[1] as {
        aspectRatings?: Array<{ translatedName?: { value?: string }; value?: number }>;
      } | null)
    : null;
  const aspectRatings = ratEntry?.aspectRatings ?? [];

  const aspects: TrivagoAspects = {};
  for (const ar of aspectRatings) {
    const key = ASPECT_MAP[ar.translatedName?.value || ""];
    if (key && ar.value) aspects[key] = Math.round((ar.value / 1000) * 10) / 10;
  }

  const urlSlug = detEntry?.userFriendlyUrl?.url ?? null;
  const trivago_url = urlSlug
    ? `https://www.trivago.pl${urlSlug}`
    : `https://www.trivago.pl/pl/oar/hotel?search=100-${nsid}`;

  return {
    rating: reviewRating?.formattedRating ? parseFloat(reviewRating.formattedRating) : null,
    reviewsCount: reviewRating?.reviewsCount ?? null,
    trivago_url,
    aspects: Object.keys(aspects).length > 0 ? aspects : null,
  };
}

interface TrivagoRatingResult extends TrivagoSearchResult {
  fromCache: boolean;
}

async function fetchTrivagoRating(
  name: string,
  cache: Record<string, TrivagoCacheEntry>
): Promise<TrivagoRatingResult> {
  if (cache[name]?.results?.length > 0) {
    const idx = cache[name].selected ?? 0;
    return { ...cache[name].results[idx], fromCache: true };
  }
  if (cache[name] && cache[name].results?.length === 0) {
    return { rating: null, reviewsCount: null, trivagoUrl: "", aspects: null, nsid: 0, name: "", locationLabel: "", fromCache: true };
  }

  const concept = await searchTrivago(name);
  if (!concept) {
    cache[name] = { results: [], selected: null, fetchedAt: new Date().toISOString() };
    return { rating: null, reviewsCount: null, trivagoUrl: "", aspects: null, nsid: 0, name: "", locationLabel: "", fromCache: false };
  }

  const ratings = await fetchTrivagoRatings(concept.nsid);

  const result: TrivagoSearchResult = {
    nsid: concept.nsid,
    name: concept.name,
    locationLabel: concept.locationLabel,
    rating: ratings.rating,
    reviewsCount: ratings.reviewsCount,
    trivagoUrl: ratings.trivago_url,
    aspects: ratings.aspects,
  };

  cache[name] = { results: [result], selected: 0, fetchedAt: new Date().toISOString() };
  return { ...result, fromCache: false };
}

async function main() {
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
          const t = await fetchTrivagoRating(h.name, cache);
          if (!t.fromCache) apiCalls++;

          completed++;
          const tag = t.fromCache ? "cache" : "api";
          if (t.rating != null) {
            found++;
            process.stdout.write(`  ${completed}/${hotels.length} ${h.name} -> ${t.rating} (${t.reviewsCount}) [${tag}]\n`);
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
