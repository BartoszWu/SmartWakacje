import type {
  Offer,
  GoogleCacheEntry,
  TACacheEntry,
  TrivagoCacheEntry,
  DescriptionCacheEntry,
  GoogleSearchResult,
  TASearchResult,
  ScraperConfig,
} from "@smartwakacje/shared";
import {
  loadGoogleCache,
  saveGoogleCache,
  loadTACache,
  saveTACache,
  loadTrivagoCache,
  saveTrivagoCache,
  loadDescriptionCache,
  saveDescriptionCache,
} from "./cache";
import { searchGoogle } from "./google";
import { searchTA } from "./tripadvisor";
import { searchTrivago } from "./trivago";
import { fetchHotelDescription } from "./wakacje-description";

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;
const RETRY_DELAY_MS = 5000;
const BATCH_TIMEOUT_MS = 45_000; // hard limit per batch (3× single request timeout)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} batch timeout (${ms / 1000}s)`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

interface UniqueHotel {
  name: string;
  city: string;
  country: string;
}

export interface EnrichFailure {
  name: string;
  error: string;
}

export interface EnrichResult {
  offers: Offer[];
  failures: { phase: string; hotels: EnrichFailure[] }[];
}

function getUniqueHotels(offers: Offer[]): UniqueHotel[] {
  const seen = new Set<string>();
  const hotels: UniqueHotel[] = [];
  for (const o of offers) {
    if (seen.has(o.name)) continue;
    seen.add(o.name);
    hotels.push({ name: o.name, city: o.city, country: o.country });
  }
  return hotels;
}

function applyGoogleRating(offer: Offer, entry: GoogleCacheEntry): void {
  if (entry.selected != null && entry.results[entry.selected]) {
    const r = entry.results[entry.selected];
    offer.googleRating = r.rating;
    offer.googleRatingsTotal = r.totalRatings;
    offer.googleMapsUrl = r.mapsUrl;
    offer.googlePlaceId = r.placeId;
  } else if (entry.results.length === 0) {
    offer.googleRating = 0;
    offer.googleRatingsTotal = 0;
  }
}

function applyTrivagoRating(offer: Offer, entry: TrivagoCacheEntry): void {
  if (entry.selected != null && entry.results[entry.selected]) {
    const r = entry.results[entry.selected];
    offer.trivagoRating = r.rating ?? undefined;
    offer.trivagoReviewsCount = r.reviewsCount ?? undefined;
    offer.trivagoUrl = r.trivagoUrl;
    offer.trivagoNsid = r.nsid;
    if (r.aspects) offer.trivagoAspects = r.aspects;
  } else if (entry.results.length === 0) {
    offer.trivagoRating = 0;
    offer.trivagoReviewsCount = 0;
  }
}

function applyTARating(offer: Offer, entry: TACacheEntry): void {
  if (entry.selected != null && entry.results[entry.selected]) {
    const r = entry.results[entry.selected];
    offer.taRating = r.rating;
    offer.taReviewCount = r.numReviews;
    offer.taUrl = r.taUrl ?? undefined;
    offer.taLocationId = r.locationId;
  } else if (entry.results.length === 0) {
    offer.taRating = 0;
    offer.taReviewCount = 0;
  }
}

export type EnrichProgress = (phase: string, done: number, total: number) => void;

// ── Generic batch fetcher with retry pass ──

interface BatchPhaseOpts<TCache> {
  label: string;
  hotels: UniqueHotel[];
  cache: Record<string, TCache>;
  saveCache: (c: Record<string, TCache>) => Promise<void>;
  fetchOne: (h: UniqueHotel) => Promise<TCache>;
  batchSize: number;
  batchDelay: number;
  onProgress?: EnrichProgress;
}

async function fetchPhaseWithRetry<TCache>(opts: BatchPhaseOpts<TCache>): Promise<EnrichFailure[]> {
  const { label, hotels, cache, saveCache: save, fetchOne, batchSize, batchDelay, onProgress } = opts;

  const missing = hotels.filter((h) => !cache[h.name]);
  if (missing.length === 0) {
    onProgress?.(label, 0, 0);
    return [];
  }

  let processed = 0;
  const failed: { hotel: UniqueHotel; error: string }[] = [];

  // ── Pass 1 ──
  let consecutiveFailures = 0;
  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);
    const results = await withTimeout(
      Promise.allSettled(batch.map((h) => fetchOne(h))),
      BATCH_TIMEOUT_MS,
      label,
    ).catch((err) =>
      // If entire batch timed out, mark all as rejected
      batch.map(() => ({ status: "rejected" as const, reason: err }))
    );

    let batchFails = 0;
    for (let j = 0; j < batch.length; j++) {
      const h = batch[j];
      const r = results[j];
      processed++;
      if (r.status === "rejected") {
        const msg = r.reason?.message ?? String(r.reason);
        console.log(`  [${label}] ${processed}/${missing.length} ${h.name} \u274c ${msg}`);
        failed.push({ hotel: h, error: msg });
        batchFails++;
      } else {
        cache[h.name] = r.value;
        const entry = r.value as { results?: unknown[] };
        const ok = entry.results && (entry.results as unknown[]).length > 0;
        if (ok) {
          console.log(`  [${label}] ${processed}/${missing.length} ${h.name} \u2705`);
        } else {
          console.log(`  [${label}] ${processed}/${missing.length} ${h.name} \u2014 no results`);
        }
      }
    }

    await save(cache);
    onProgress?.(label, processed, missing.length);

    // Dynamic backoff: increase delay when consecutive batches have failures
    if (batchFails > 0) {
      consecutiveFailures++;
    } else {
      consecutiveFailures = 0;
    }

    if (i + batchSize < missing.length) {
      const backoff = Math.min(batchDelay * Math.pow(2, consecutiveFailures), 10_000);
      if (consecutiveFailures > 0) {
        console.log(`  [${label}] backoff ${backoff}ms (${consecutiveFailures} consecutive failed batches)`);
      }
      await sleep(backoff);
    }
  }

  // ── Pass 2: retry failed ──
  if (failed.length > 0) {
    console.log(`  [${label}] Retrying ${failed.length} failed hotel(s) in ${RETRY_DELAY_MS / 1000}s...`);
    await sleep(RETRY_DELAY_MS);

    const stillFailed: EnrichFailure[] = [];
    for (let i = 0; i < failed.length; i++) {
      const { hotel } = failed[i];
      try {
        const val = await fetchOne(hotel);
        cache[hotel.name] = val;
        console.log(`  [${label}] retry ${i + 1}/${failed.length} ${hotel.name} \u2705`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`  [${label}] retry ${i + 1}/${failed.length} ${hotel.name} \u274c ${msg}`);
        stillFailed.push({ name: hotel.name, error: msg });
      }
      if (i < failed.length - 1) await sleep(1000);
    }

    await save(cache);
    return stillFailed;
  }

  return [];
}

export async function enrichOffers(
  offers: Offer[],
  onProgress?: EnrichProgress,
  /** If provided, only enrich these specific hotel names (for retry) */
  onlyHotels?: Set<string>,
  /** Snapshot config needed for description fetching */
  snapshotConfig?: ScraperConfig,
): Promise<EnrichResult> {
  const allHotels = getUniqueHotels(offers);
  const hotels = onlyHotels
    ? allHotels.filter((h) => onlyHotels.has(h.name))
    : allHotels;
  const googleCache = await loadGoogleCache();
  const trivagoCache = await loadTrivagoCache();

  const hasGoogleKey = !!process.env.GOOGLE_MAPS_API_KEY;
  const hasTAKey = !!process.env.TRIPADVISOR_API_KEY;

  const taCache: Record<string, TACacheEntry> = hasTAKey ? await loadTACache() : {};

  const allFailures: { phase: string; hotels: EnrichFailure[] }[] = [];

  // ── Phases 1-3: fetch all providers in parallel ──
  const phases: Promise<{ phase: string; failures: EnrichFailure[] }>[] = [];

  if (hasGoogleKey) {
    phases.push(
      fetchPhaseWithRetry<GoogleCacheEntry>({
        label: "Google Maps",
        hotels,
        cache: googleCache,
        saveCache: saveGoogleCache,
        fetchOne: async (h) => {
          const results: GoogleSearchResult[] = await searchGoogle(h.name, h.city, h.country);
          return {
            results,
            selected: results.length === 1 ? 0 : null,
            fetchedAt: new Date().toISOString(),
          };
        },
        batchSize: BATCH_SIZE,
        batchDelay: BATCH_DELAY_MS,
        onProgress,
      }).then((failures) => ({ phase: "Google Maps", failures })),
    );
  }

  phases.push(
    fetchPhaseWithRetry<TrivagoCacheEntry>({
      label: "Trivago",
      hotels,
      cache: trivagoCache,
      saveCache: saveTrivagoCache,
      fetchOne: async (h) => {
        const results = await searchTrivago(h.name);
        return {
          results,
          selected: results.length === 1 ? 0 : null,
          fetchedAt: new Date().toISOString(),
        };
      },
      batchSize: 2,
      batchDelay: 2000,
      onProgress,
    }).then((failures) => ({ phase: "Trivago", failures })),
  );

  if (hasTAKey) {
    phases.push(
      fetchPhaseWithRetry<TACacheEntry>({
        label: "TripAdvisor",
        hotels,
        cache: taCache,
        saveCache: saveTACache,
        fetchOne: async (h) => {
          const results: TASearchResult[] = await searchTA(h.name, h.city, h.country);
          return {
            results,
            selected: results.length === 1 ? 0 : null,
            fetchedAt: new Date().toISOString(),
          };
        },
        batchSize: 2,
        batchDelay: 1000,
        onProgress,
      }).then((failures) => ({ phase: "TripAdvisor", failures })),
    );
  }

  // ── Descriptions phase (parallel with ratings) ──
  if (snapshotConfig && snapshotConfig.fetchDescriptions !== false) {
    const descCache = await loadDescriptionCache();
    const descConfig = {
      adults: snapshotConfig.adults,
      kids: snapshotConfig.children,
      kidsAges: snapshotConfig.childAges,
      departureCityId: snapshotConfig.airports[0],
    };

    // Deduplicate by hotelId or name
    const seenDesc = new Set<string>();
    const descHotels: Offer[] = [];
    for (const o of offers) {
      const key = o.hotelId ? String(o.hotelId) : o.name;
      if (seenDesc.has(key)) continue;
      if (descCache[o.name]) continue;
      if (onlyHotels && !onlyHotels.has(o.name)) continue;
      seenDesc.add(key);
      descHotels.push(o);
    }

    phases.push(
      (async (): Promise<{ phase: string; failures: EnrichFailure[] }> => {
        if (descHotels.length === 0) {
          onProgress?.("Descriptions", 0, 0);
          return { phase: "Descriptions", failures: [] };
        }

        const descFailures: EnrichFailure[] = [];
        let descProcessed = 0;

        for (const offer of descHotels) {
          descProcessed++;
          try {
            const entry = await fetchHotelDescription(offer, descConfig);
            descCache[offer.name] = entry;
            const descCount = entry.descriptions.length;
            console.log(`  [Descriptions] ${descProcessed}/${descHotels.length} ${offer.name} \u2705 (${descCount} sections)`);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.log(`  [Descriptions] ${descProcessed}/${descHotels.length} ${offer.name} \u274c ${msg}`);
            descFailures.push({ name: offer.name, error: msg });
          }

          await saveDescriptionCache(descCache);
          onProgress?.("Descriptions", descProcessed, descHotels.length);

          if (descProcessed < descHotels.length) await sleep(2500);
        }

        return { phase: "Descriptions", failures: descFailures };
      })(),
    );
  }

  const phaseResults = await Promise.allSettled(phases);
  for (const result of phaseResults) {
    if (result.status === "fulfilled" && result.value.failures.length > 0) {
      allFailures.push({ phase: result.value.phase, hotels: result.value.failures });
    } else if (result.status === "rejected") {
      console.error("Enrichment phase failed entirely:", result.reason);
    }
  }

  // ── Apply all cached ratings to offers ──
  for (const offer of offers) {
    const g = googleCache[offer.name];
    if (g) applyGoogleRating(offer, g);

    const t = trivagoCache[offer.name];
    if (t) applyTrivagoRating(offer, t);

    if (hasTAKey) {
      const ta = taCache[offer.name];
      if (ta) applyTARating(offer, ta);
    }
  }

  // ── Summary ──
  if (allFailures.length > 0) {
    console.log("\n  === Enrichment failures ===");
    for (const f of allFailures) {
      console.log(`  [${f.phase}] ${f.hotels.length} failed:`);
      for (const h of f.hotels) {
        console.log(`    - ${h.name}: ${h.error}`);
      }
    }
  }

  return { offers, failures: allFailures };
}
