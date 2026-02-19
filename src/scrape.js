#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  fetchAllOffers,
  COUNTRIES,
  DEPARTURES,
  SERVICE,
  ATTRIBUTES,
} from "./wakacje-api.js";

// --- CONFIGURE YOUR SEARCH ---
const searchOpts = {
  countryIds: [COUNTRIES.TUNEZJA, COUNTRIES.TURCJA],
  departureIds: [DEPARTURES.KATOWICE],
  departureDate: "2026-06-19",
  arrivalDate: "2026-06-30",
  adults: 2,
  kids: 2,
  kidAges: ["20190603", "20210125"],
  service: [SERVICE.ALL_INCLUSIVE],
  attributes: [ATTRIBUTES.FOR_CHILDREN],
};

console.log("=".repeat(60));
console.log("wakacje.pl Offer Scraper");
console.log("=".repeat(60));
console.log();
console.log("Search params:", JSON.stringify(searchOpts, null, 2));
console.log();

const result = await fetchAllOffers(searchOpts, {
  limitPerPage: 50,
  maxPages: undefined, // all pages
  delayMs: 1000,
  onProgress({ page, total, fetched }) {
    console.log(`  page ${page}/${total} — ${fetched} offers collected`);
  },
});

// Save to JSON
const outPath = resolve("wakacje_offers.json");
await writeFile(outPath, JSON.stringify(result, null, 2), "utf-8");

console.log();
console.log(
  `Done! ${result.fetchedCount}/${result.totalCount} offers -> ${outPath}`
);
console.log();

// Summary
if (result.offers.length > 0) {
  const prices = result.offers.map((o) => o.price).filter(Boolean);
  if (prices.length) {
    console.log(
      `Price range: ${Math.min(...prices)} - ${Math.max(...prices)} PLN`
    );
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    console.log(`Average price: ${Math.round(avg)} PLN`);
  }

  const countries = {};
  for (const o of result.offers) {
    const c = o.place?.country?.name ?? "Unknown";
    countries[c] = (countries[c] || 0) + 1;
  }
  console.log("By country:", countries);

  const operators = {};
  for (const o of result.offers) {
    const op = o.tourOperatorName ?? "Unknown";
    operators[op] = (operators[op] || 0) + 1;
  }
  const topOps = Object.entries(operators)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log("Top operators:", Object.fromEntries(topOps));
}
