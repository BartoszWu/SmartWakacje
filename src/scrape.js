#!/usr/bin/env node

/**
 * Usage:  node scrape.js <departureDate> <arrivalDate>
 * Example: node scrape.js 2026-06-19 2026-06-30
 *
 * Hardcoded: 2 adults + 2 kids (born 2019-06-03 & 2021-01-25), Katowice,
 *            All Inclusive, Tunezja + Turcja, "dla dzieci" attribute.
 */

import https from "node:https";
import { writeFile, mkdir } from "node:fs/promises";

// ── Config ──────────────────────────────────────────────────
const DEPARTURE_DATE = process.argv[2] || "2026-06-19";
const ARRIVAL_DATE = process.argv[3] || "2026-06-30";

const ROOMS = [{ adult: 2, kid: 2, ages: ["20190603", "20210125"] }];
const DEPARTURE = [2622]; // Katowice
const COUNTRIES = ["65", "16"]; // Tunezja, Turcja
const SERVICE = [1]; // All Inclusive
const ATTRIBUTE = ["29"]; // dla dzieci

const LIMIT = 50; // offers per page
const BATCH_SIZE = 5; // parallel requests per batch
const BATCH_DELAY_MS = 200;
// ────────────────────────────────────────────────────────────

function buildBody(page) {
  return [
    {
      method: "search.tripsSearch",
      params: {
        brand: "WAK",
        limit: LIMIT,
        priceHistory: 1,
        imageSizes: ["570,428"],
        flatArray: true,
        multiSearch: true,
        withHotelRate: 1,
        withPromoOffer: 0,
        recommendationVersion: "noTUI",
        imageLimit: 10,
        withPromotionsInfo: false,
        type: "tours",
        firstMinuteTui: false,
        countryId: COUNTRIES,
        regionId: [],
        cityId: [],
        hotelId: [],
        roundTripId: [],
        cruiseId: [],
        searchType: "wczasy",
        offersAttributes: [],
        alternative: { countryId: [], regionId: [], cityId: [] },
        qsVersion: "cx",
        query: {
          campTypes: [],
          qsVersion: "cx",
          qsVersionLast: 0,
          tab: false,
          candy: false,
          pok: null,
          flush: false,
          tourOpAndCode: null,
          obj_type: null,
          catalog: null,
          roomType: null,
          test: null,
          year: null,
          month: null,
          rangeDate: null,
          withoutLast: 0,
          category: false,
          "not-attribute": false,
          pageNumber: page,
          departureDate: DEPARTURE_DATE,
          arrivalDate: ARRIVAL_DATE,
          departure: DEPARTURE,
          type: [],
          duration: { min: 7, max: 28 },
          minPrice: null,
          maxPrice: null,
          service: SERVICE,
          firstminute: null,
          attribute: ATTRIBUTE,
          promotion: [],
          tourId: null,
          search: null,
          minCategory: null,
          maxCategory: 50,
          sort: 13,
          order: 1,
          totalPrice: true,
          rank: null,
          withoutTours: [],
          withoutCountry: [],
          withoutTrips: [],
          rooms: ROOMS,
          offerCode: null,
          dedicatedOffer: false,
        },
        durationMin: "7",
      },
    },
  ];
}

function post(body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body));
    const req = https.request(
      {
        hostname: "www.wakacje.pl",
        path: "/v2/api/offers",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": data.length,
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Origin: "https://www.wakacje.pl",
          Referer: "https://www.wakacje.pl/wczasy/",
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          if (res.statusCode !== 200)
            return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          const json = JSON.parse(raw);
          if (!json.success)
            return reject(new Error(`API: ${json.error?.message}`));
          resolve(json.data);
        });
      }
    );
    req.on("error", reject);
    req.end(data);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── URL builder ─────────────────────────────────────────────

const SERVICE_URL = { 1: "all-inclusive", 2: "half-board", 3: "full-board", 4: "bed-and-breakfast" };

function buildOfferUrl(o) {
  const country = o.place?.country?.urlName;
  const region = o.place?.region?.urlName;
  const city = o.place?.city?.urlName;
  if (!country || !region || !city) return null;

  const slug = `${o.urlName}-${o.offerId}`;
  const svc = SERVICE_URL[o.service] || "all-inclusive";
  const room = ROOMS.map((r) => {
    let s = `${r.adult}dorosl${r.adult < 5 ? "e" : "ych"}`;
    if (r.kid) s += `-${r.kid}dziec${r.kid < 2 ? "ko" : "i"}`;
    if (r.ages?.length) s += `-${r.ages.join("-")}`;
    return s;
  }).join(",");

  const qs = [
    `od-${o.departureDate}`,
    `${o.duration}-dni`,
    svc,
    "z-katowic",
    "srcx",
    room,
  ].join(",");

  return `https://www.wakacje.pl/oferty/${country}/${region}/${city}/${slug}.html?${qs}`;
}

// ── Parse to clean format ───────────────────────────────────

function parseOffer(o) {
  return {
    // basics
    name: o.name,
    placeName: o.placeName,
    url: buildOfferUrl(o),

    // location
    country: o.place?.country?.name,
    region: o.place?.region?.name,
    city: o.place?.city?.name,

    // dates & duration
    duration: o.duration,
    departureDate: o.departureDate,
    returnDate: o.returnDate,

    // ratings
    ratingString: o.ratingString,
    ratingValue: o.ratingValue,
    ratingRecommends: o.ratingRecommends,
    ratingReservationCount: o.ratingReservationCount,

    // price — you definitely want this
    price: o.price,
    pricePerPerson: Math.round(o.price / (ROOMS[0].adult + ROOMS[0].kid)),
    priceOld: o.priceOld || null,
    priceDiscount: o.priceDiscount || null,

    // hotel quality
    category: o.category,          // stars (1-5)
    serviceDesc: o.serviceDesc,    // "Ultra All Inclusive" / "All Inclusive" etc.

    // operator
    tourOperator: o.tourOperatorName,

    // transport
    departurePlace: o.departurePlace,
    departureTypeName: o.departureTypeName,

    // promos
    promoLastMinute: o.promoLastMinute,
    promoFirstMinute: o.promoFirstMinute,

    // staff verification — how many wakacje.pl employees reviewed this hotel
    employeeRatingCount: o.employeeRatingCount || 0,

    // photo (first one, full url)
    photo: o.photos?.["570,428"]?.[0]
      ? `https://www.wakacje.pl${o.photos["570,428"][0]}`
      : null,
  };
}

// ── Main ────────────────────────────────────────────────────
console.log(`Scraping: ${DEPARTURE_DATE} → ${ARRIVAL_DATE}`);
console.log(`Batch:    ${BATCH_SIZE} parallel, ${BATCH_DELAY_MS}ms between batches\n`);

// Page 1 — get total count
const first = await post(buildBody(1));
const total = first.count;
const totalPages = Math.ceil(total / LIMIT);
process.stdout.write(`  1/${totalPages} (${first.offers.length}/${total})\n`);

// Remaining pages in parallel batches
const pageResults = new Array(totalPages);
pageResults[0] = first.offers;

for (let b = 1; b < totalPages; b += BATCH_SIZE) {
  const batch = [];
  for (let p = b; p < Math.min(b + BATCH_SIZE, totalPages); p++) {
    batch.push(p + 1); // page numbers are 1-indexed
  }

  const results = await Promise.all(batch.map((p) => post(buildBody(p))));
  for (let i = 0; i < results.length; i++) {
    const p = batch[i];
    pageResults[p - 1] = results[i].offers;
    const fetched = pageResults.reduce((s, r) => s + (r ? r.length : 0), 0);
    process.stdout.write(`  ${p}/${totalPages} (${fetched}/${total})\n`);
  }

  if (b + BATCH_SIZE < totalPages) await sleep(BATCH_DELAY_MS);
}

const allOffers = pageResults.flat();

await mkdir("data", { recursive: true });

// 1. Raw file
const rawFile = `data/raw_${DEPARTURE_DATE}_${ARRIVAL_DATE}.json`;
await writeFile(
  rawFile,
  JSON.stringify({ totalCount: total, fetchedCount: allOffers.length, offers: allOffers, fetchedAt: new Date().toISOString() }, null, 2)
);

// 2. Parsed file (JSON)
const parsed = allOffers.map(parseOffer);
const parsedFile = `data/offers_${DEPARTURE_DATE}_${ARRIVAL_DATE}.json`;
await writeFile(parsedFile, JSON.stringify(parsed, null, 2));

// 3. CSV file
const CSV_COLUMNS = [
  "name", "placeName", "url", "country", "region", "city",
  "duration", "departureDate", "returnDate",
  "ratingString", "ratingValue", "ratingRecommends", "ratingReservationCount",
  "price", "pricePerPerson", "priceOld", "priceDiscount",
  "category", "serviceDesc", "tourOperator",
  "departurePlace", "departureTypeName",
  "promoLastMinute", "promoFirstMinute", "employeeRatingCount", "photo",
];

function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const csvRows = [
  CSV_COLUMNS.join(","),
  ...parsed.map((o) => CSV_COLUMNS.map((col) => escapeCsv(o[col])).join(",")),
];
const csvFile = `data/offers_${DEPARTURE_DATE}_${ARRIVAL_DATE}.csv`;
await writeFile(csvFile, "\uFEFF" + csvRows.join("\n"), "utf8");

const prices = parsed.map((o) => o.price).filter(Boolean);
console.log(`\nSaved ${allOffers.length} offers`);
console.log(`  raw    → ${rawFile}`);
console.log(`  parsed → ${parsedFile}`);
console.log(`  csv    → ${csvFile}`);
console.log(`  Price: ${Math.min(...prices)} – ${Math.max(...prices)} PLN (avg ${Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)})`);
