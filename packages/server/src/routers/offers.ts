import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import {
  loadOffers,
  saveOffers,
  loadGoogleCache,
  saveGoogleCache,
  loadTACache,
  saveTACache,
  loadTrivagoCache,
  saveTrivagoCache,
} from "../services/cache";
import { searchGoogle } from "../services/google";
import { searchTA, fetchTADetails } from "../services/tripadvisor";
import { searchTrivago } from "../services/trivago";
import type { Offer } from "@smartwakacje/shared";

export const offersRouter = router({
  list: publicProcedure.query(async () => {
    return loadOffers();
  }),

  fetchGoogleRating: publicProcedure
    .input(
      z.object({
        name: z.string(),
        city: z.string(),
        country: z.string(),
      })
    )
    .query(async ({ input }) => {
      const cache = await loadGoogleCache();

      if (cache[input.name]) {
        return {
          results: cache[input.name].results,
          selected: cache[input.name].selected ?? null,
          fromCache: true,
        };
      }

      const results = await searchGoogle(input.name, input.city, input.country);
      cache[input.name] = {
        results,
        selected: results.length === 1 ? 0 : null,
        fetchedAt: new Date().toISOString(),
      };
      await saveGoogleCache(cache);

      if (results.length === 1) {
        await updateOfferGoogleRating(input.name, results[0]);
      }

      return { results, selected: cache[input.name].selected, fromCache: false };
    }),

  selectGoogleRating: publicProcedure
    .input(
      z.object({
        hotelName: z.string(),
        selectedIndex: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const cache = await loadGoogleCache();
      if (!cache[input.hotelName]?.results?.[input.selectedIndex]) {
        throw new Error("Hotel or index not in cache");
      }

      cache[input.hotelName].selected = input.selectedIndex;
      await saveGoogleCache(cache);

      const selected = cache[input.hotelName].results[input.selectedIndex];
      await updateOfferGoogleRating(input.hotelName, selected);

      return { ok: true, selected };
    }),

  fetchTARating: publicProcedure
    .input(
      z.object({
        name: z.string(),
        city: z.string(),
        country: z.string(),
      })
    )
    .query(async ({ input }) => {
      const cache = await loadTACache();

      if (cache[input.name]) {
        return {
          results: cache[input.name].results,
          selected: cache[input.name].selected ?? null,
          fromCache: true,
        };
      }

      const results = await searchTA(input.name, input.city, input.country);
      cache[input.name] = {
        results,
        selected: results.length === 1 ? 0 : null,
        fetchedAt: new Date().toISOString(),
      };
      await saveTACache(cache);

      if (results.length === 1) {
        await updateOfferTARating(input.name, results[0]);
      }

      return { results, selected: cache[input.name].selected, fromCache: false };
    }),

  selectTARating: publicProcedure
    .input(
      z.object({
        hotelName: z.string(),
        selectedIndex: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const cache = await loadTACache();
      if (!cache[input.hotelName]?.results?.[input.selectedIndex]) {
        throw new Error("Hotel or index not in cache");
      }

      const candidate = cache[input.hotelName].results[input.selectedIndex];

      if (candidate.rating == null && candidate.taUrl == null) {
        const details = await fetchTADetails(candidate.locationId);
        candidate.rating = details.rating;
        candidate.numReviews = details.numReviews;
        candidate.taUrl = details.taUrl;
      }

      cache[input.hotelName].selected = input.selectedIndex;
      await saveTACache(cache);
      await updateOfferTARating(input.hotelName, candidate);

      return { ok: true, selected: candidate };
    }),

  fetchTrivagoRating: publicProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .query(async ({ input }) => {
      const cache = await loadTrivagoCache();

      if (cache[input.name]) {
        return {
          results: cache[input.name].results,
          selected: cache[input.name].selected ?? null,
          fromCache: true,
        };
      }

      const results = await searchTrivago(input.name);
      cache[input.name] = {
        results,
        selected: results.length === 1 ? 0 : null,
        fetchedAt: new Date().toISOString(),
      };
      await saveTrivagoCache(cache);

      if (results.length === 1) {
        await updateOfferTrivagoRating(input.name, results[0]);
      }

      return { results, selected: cache[input.name].selected, fromCache: false };
    }),

  selectTrivagoRating: publicProcedure
    .input(
      z.object({
        hotelName: z.string(),
        selectedIndex: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const cache = await loadTrivagoCache();
      if (!cache[input.hotelName]?.results?.[input.selectedIndex]) {
        throw new Error("Hotel or index not in cache");
      }

      cache[input.hotelName].selected = input.selectedIndex;
      await saveTrivagoCache(cache);

      const selected = cache[input.hotelName].results[input.selectedIndex];
      await updateOfferTrivagoRating(input.hotelName, selected);

      return { ok: true, selected };
    }),
});

async function updateOfferGoogleRating(
  hotelName: string,
  result: { rating: number; totalRatings: number; mapsUrl: string }
) {
  const offers = await loadOffers();
  let changed = false;

  for (const o of offers) {
    if (o.name === hotelName) {
      o.googleRating = result.rating;
      o.googleRatingsTotal = result.totalRatings;
      o.googleMapsUrl = result.mapsUrl;
      changed = true;
    }
  }

  if (changed) await saveOffers(offers);
}

async function updateOfferTARating(
  hotelName: string,
  result: { rating: number | null; numReviews: number | null; taUrl: string | null; locationId: string }
) {
  const offers = await loadOffers();
  let changed = false;

  for (const o of offers) {
    if (o.name === hotelName) {
      o.taRating = result.rating;
      o.taReviewCount = result.numReviews;
      o.taUrl = result.taUrl ?? undefined;
      o.taLocationId = result.locationId;
      changed = true;
    }
  }

  if (changed) await saveOffers(offers);
}

async function updateOfferTrivagoRating(
  hotelName: string,
  result: {
    nsid: number;
    rating: number | null;
    reviewsCount: number | null;
    trivagoUrl: string;
    aspects?: { [key: string]: number } | null;
  }
) {
  const offers = await loadOffers();
  let changed = false;

  for (const o of offers) {
    if (o.name === hotelName) {
      o.trivagoRating = result.rating ?? undefined;
      o.trivagoReviewsCount = result.reviewsCount ?? undefined;
      o.trivagoUrl = result.trivagoUrl;
      o.trivagoNsid = result.nsid;
      if (result.aspects) {
        o.trivagoAspects = result.aspects;
      }
      changed = true;
    }
  }

  if (changed) await saveOffers(offers);
}
