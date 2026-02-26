import type { ScraperConfig, FetchConfig, ReportConfig } from "@smartwakacje/shared";

// Reference IDs and default runtime settings are centralized here.
// Keep docs aligned with this file as the primary editable source.
export const AIRPORT_IDS: Record<string, number> = {
  "Katowice": 2622,
  "Warszawa": 2619,
  "Kraków": 2620,
  "Wrocław": 2621,
  "Poznań": 2623,
  "Gdańsk": 2624,
  "Łódź": 2625,
  "Rzeszów": 2626,
  "Szczecin": 2627,
  "Bydgoszcz": 2628,
};

export const COUNTRY_IDS: Record<string, number> = {
  "Tunezja": 65,
  "Turcja": 16,
  "Egipt": 8,
  "Grecja": 12,
  "Hiszpania": 7,
  "Chorwacja": 55,
  "Bułgaria": 53,
  "Cypr": 29,
  "Maroko": 60,
  "Portugalia": 41,
  "Włochy": 13,
  "Czarnogóra": 84,
  "Albania": 95,
  "Malta": 48,
};

export const SERVICE_TYPES: Record<string, number> = {
  "All Inclusive": 1,
  "Ultra All Inclusive": 2,
  "Śniadania i obiadokolacje": 3,
  "Śniadania": 4,
  "Bez wyżywienia": 5,
};

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
