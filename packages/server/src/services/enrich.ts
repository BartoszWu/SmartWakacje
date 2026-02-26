import type {
  Offer,
  GoogleCacheEntry,
  TACacheEntry,
  TrivagoCacheEntry,
  GoogleSearchResult,
  TASearchResult,
  TrivagoSearchResult,
} from "@smartwakacje/shared";
import {
  loadGoogleCache,
  saveGoogleCache,
  loadTACache,
  saveTACache,
  loadTrivagoCache,
  saveTrivagoCache,
} from "./cache";
import { searchGoogle } from "./google";
import { searchTA } from "./tripadvisor";
import { searchTrivago } from "./trivago";

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface UniqueHotel {
  name: string;
  city: string;
  country: string;
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

export async function enrichOffers(
  offers: Offer[],
  onProgress?: EnrichProgress
): Promise<Offer[]> {
  const hotels = getUniqueHotels(offers);
  const googleCache = await loadGoogleCache();
  const trivagoCache = await loadTrivagoCache();

  const hasGoogleKey = !!process.env.GOOGLE_MAPS_API_KEY;
  const hasTAKey = !!process.env.TRIPADVISOR_API_KEY;

  let taCache: Record<string, TACacheEntry> = {};
  if (hasTAKey) taCache = await loadTACache();

  // ── Phase 1: fetch missing from Google ──
  const googleMissing = hotels.filter((h) => !googleCache[h.name]);
  if (hasGoogleKey && googleMissing.length > 0) {
    for (let i = 0; i < googleMissing.length; i += BATCH_SIZE) {
      const batch = googleMissing.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((h) => searchGoogle(h.name, h.city, h.country))
      );

      for (let j = 0; j < batch.length; j++) {
        const h = batch[j];
        const r = results[j];
        if (r.status === "rejected") {
          console.warn(`  [Google] FAIL "${h.name}": ${r.reason?.message ?? r.reason}`);
          continue;
        }
        const searchResults: GoogleSearchResult[] = r.value;
        googleCache[h.name] = {
          results: searchResults,
          selected: searchResults.length === 1 ? 0 : null,
          fetchedAt: new Date().toISOString(),
        };
      }

      await saveGoogleCache(googleCache);
      onProgress?.("Google Maps", Math.min(i + BATCH_SIZE, googleMissing.length), googleMissing.length);
      if (i + BATCH_SIZE < googleMissing.length) await sleep(BATCH_DELAY_MS);
    }
  }

  // ── Phase 2: fetch missing from Trivago ──
  const TRIVAGO_BATCH = 2;
  const TRIVAGO_DELAY = 2000;
  const trivagoMissing = hotels.filter((h) => !trivagoCache[h.name]);
  if (trivagoMissing.length > 0) {
    console.log(`  [Trivago] ${trivagoMissing.length} hotels to fetch (batch=${TRIVAGO_BATCH}, delay=${TRIVAGO_DELAY}ms)`);
    for (let i = 0; i < trivagoMissing.length; i += TRIVAGO_BATCH) {
      const batch = trivagoMissing.slice(i, i + TRIVAGO_BATCH);
      console.log(`  [Trivago] batch ${i}-${i + batch.length}: ${batch.map(h => h.name).join(", ")}`);
      const results = await Promise.allSettled(
        batch.map((h) => searchTrivago(h.name))
      );

      const retries: UniqueHotel[] = [];
      for (let j = 0; j < batch.length; j++) {
        const h = batch[j];
        const r = results[j];
        if (r.status === "rejected") {
          console.warn(`  [Trivago] FAIL "${h.name}": ${r.reason?.message ?? r.reason}`);
          retries.push(h);
          continue;
        }
        trivagoCache[h.name] = {
          results: r.value,
          selected: r.value.length === 1 ? 0 : null,
          fetchedAt: new Date().toISOString(),
        };
      }

      if (retries.length > 0) {
        console.log(`  [Trivago] retrying ${retries.length} failed hotel(s) after 3s...`);
        await sleep(3000);
        for (const hotel of retries) {
          try {
            const val = await searchTrivago(hotel.name);
            trivagoCache[hotel.name] = {
              results: val,
              selected: val.length === 1 ? 0 : null,
              fetchedAt: new Date().toISOString(),
            };
            console.log(`  [Trivago] retry OK "${hotel.name}"`);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`  [Trivago] retry FAIL "${hotel.name}": ${msg} (skipping, will retry next run)`);
          }
          await sleep(1000);
        }
      }

      await saveTrivagoCache(trivagoCache);
      onProgress?.("Trivago", Math.min(i + TRIVAGO_BATCH, trivagoMissing.length), trivagoMissing.length);
      if (i + TRIVAGO_BATCH < trivagoMissing.length) await sleep(TRIVAGO_DELAY);
    }
  }

  // ── Phase 3: fetch missing from TripAdvisor ──
  if (hasTAKey) {
    const taMissing = hotels.filter((h) => !taCache[h.name]);
    if (taMissing.length > 0) {
      const TA_BATCH = 2;
      const TA_DELAY = 1000;
      for (let i = 0; i < taMissing.length; i += TA_BATCH) {
        const batch = taMissing.slice(i, i + TA_BATCH);
        const results = await Promise.allSettled(
          batch.map((h) => searchTA(h.name, h.city, h.country))
        );

        for (let j = 0; j < batch.length; j++) {
          const h = batch[j];
          const r = results[j];
          if (r.status === "rejected") {
            console.warn(`  [TA] FAIL "${h.name}": ${r.reason?.message ?? r.reason}`);
            continue;
          }
          const searchResults: TASearchResult[] = r.value;
          taCache[h.name] = {
            results: searchResults,
            selected: searchResults.length === 1 ? 0 : null,
            fetchedAt: new Date().toISOString(),
          };
        }

        await saveTACache(taCache);
        onProgress?.("TripAdvisor", Math.min(i + TA_BATCH, taMissing.length), taMissing.length);
        if (i + TA_BATCH < taMissing.length) await sleep(TA_DELAY);
      }
    }
  }

  // ── Phase 4: apply all cached ratings to offers ──
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

  return offers;
}
