// @ts-check

/**
 * @typedef {{ minRating?: number, maxPrice?: number, batchSize?: number, batchDelayMs?: number }} ProviderOverrides
 * @typedef {{ minRating: number, maxPrice: number, batchSize: number, batchDelayMs: number, googleMaps?: ProviderOverrides, tripAdvisor?: ProviderOverrides }} FetchConfig
 * @typedef {{ maxPrice: number, minGmaps: number, minTripAdvisor: number, minTrivago: number }} ReportConfig
 */

/** @type {{ fetch: FetchConfig, report: ReportConfig }} */
export const config = {
  /** Filters and batching for fetch-gmaps-ratings.js and fetch-ta-ratings.js */
  fetch: {
    minRating: 6,       // minimum wakacje.pl ratingValue to fetch external ratings for
    maxPrice: 14000,    // maximum offer price (PLN) to fetch external ratings for
    batchSize: 5,       // parallel requests per batch (default for all providers)
    batchDelayMs: 200,  // delay between batches in ms (default for all providers)

    // Provider-specific overrides (merged with defaults above)
    googleMaps: {
      // batchSize: 5,
      // batchDelayMs: 200,
    },
    tripAdvisor: {
      minRating: 7,
      batchSize: 2,
      batchDelayMs: 1000,
    },
    trivago: {
      // No API key needed — scrapes public SSR data
      batchSize: 5,
      batchDelayMs: 500,
    },
  },

  /** Default filters for report.js — overridable via CLI args (--price, --gmaps, --ta, --trivago) */
  report: {
    maxPrice: 12500,    // maximum offer price (PLN)
    minGmaps: 4,        // minimum Google Maps rating (range: 1.0–5.0)
    minTripAdvisor: 4,  // minimum TripAdvisor rating (range: 1.0–5.0, 0 = disabled)
    minTrivago: 8,      // minimum Trivago rating (range: 1.0–10.0, 0 = disabled)
  },
};
