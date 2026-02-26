import type { ScraperConfig, FetchConfig, ReportConfig } from "@smartwakacje/shared";
export { AIRPORT_IDS, COUNTRY_IDS, SERVICE_TYPES } from "@smartwakacje/shared";

// ═══════════════════════════════════════════════════════════════
// SCRAPER CONFIG
// ═══════════════════════════════════════════════════════════════

export const scraperConfig: ScraperConfig = {
  departureDateFrom: "2026-06-19",
  departureDateTo: "2026-06-30",
  airports: [2622],           // Katowice
  countries: [65, 16],        // Tunezja, Turcja
  service: 1,                 // All Inclusive
  adults: 2,
  children: 2,
  childAges: ["20190603", "20210125"],
  pageSize: 50,
  delayBetweenPages: 1000,
};

// ═══════════════════════════════════════════════════════════════
// FETCH CONFIG (batch ratings)
// ═══════════════════════════════════════════════════════════════

export const fetchConfig: FetchConfig = {
  minRating: 6,
  maxPrice: 14000,
  batchSize: 5,
  batchDelayMs: 200,
  googleMaps: {},
  tripAdvisor: {
    minRating: 7,
    batchSize: 2,
    batchDelayMs: 1000,
  },
  trivago: {
    batchSize: 5,
    batchDelayMs: 500,
  },
};

// ═══════════════════════════════════════════════════════════════
// REPORT CONFIG
// ═══════════════════════════════════════════════════════════════

export const reportConfig: ReportConfig = {
  maxPrice: 12500,
  minGmaps: 4,
  minTripAdvisor: 4,
  minTrivago: 8,
};
