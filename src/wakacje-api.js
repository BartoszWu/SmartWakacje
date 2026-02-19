/**
 * wakacje.pl offers API client.
 * See FINDINGS.md for full documentation of the reverse-engineered API.
 *
 * Uses node:https directly because the server returns HTTP 449 to Node's
 * built-in fetch (likely bot detection based on TLS fingerprint / HTTP/2).
 */

import https from "node:https";

const API_URL = "https://www.wakacje.pl/v2/api/offers";

const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Origin: "https://www.wakacje.pl",
  Referer: "https://www.wakacje.pl/wczasy/",
};

/**
 * Known IDs for convenience.
 */
export const COUNTRIES = {
  EGIPT: "1",
  GRECJA: "2",
  CHORWACJA: "6",
  TURCJA: "16",
  HISZPANIA: "17",
  TUNEZJA: "65",
};

export const DEPARTURES = {
  WARSZAWA: 2612,
  GDANSK: 2614,
  POZNAN: 2616,
  KRAKOW: 2618,
  WROCLAW: 2620,
  KATOWICE: 2622,
  LODZ: 2640,
};

export const SERVICE = {
  ALL_INCLUSIVE: 1,
  HALF_BOARD: 2,
  FULL_BOARD: 3,
  BED_AND_BREAKFAST: 4,
};

export const SORT = {
  PRICE_ASC: 1,
  PRICE_DESC: 2,
  RATING_DESC: 3,
  MOST_POPULAR: 13,
  RECOMMENDED: 14,
};

export const ATTRIBUTES = {
  FOR_CHILDREN: "29",
};

/**
 * Build the request body for the offers API.
 * @param {object} opts
 * @param {string[]} opts.countryIds
 * @param {number[]} opts.departureIds
 * @param {string} opts.departureDate - "YYYY-MM-DD"
 * @param {string} opts.arrivalDate - "YYYY-MM-DD"
 * @param {number} [opts.adults=2]
 * @param {number} [opts.kids=0]
 * @param {string[]} [opts.kidAges] - birth dates as "YYYYMMDD"
 * @param {number[]} [opts.service]
 * @param {string[]} [opts.attributes]
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=50]
 * @param {number} [opts.sort=13]
 * @param {number} [opts.order=1]
 * @param {number} [opts.durationMin=7]
 * @param {number} [opts.durationMax=28]
 */
export function buildSearchRequest({
  countryIds,
  departureIds,
  departureDate,
  arrivalDate,
  adults = 2,
  kids = 0,
  kidAges = [],
  service = [],
  attributes = [],
  page = 1,
  limit = 50,
  sort = SORT.MOST_POPULAR,
  order = 1,
  durationMin = 7,
  durationMax = 28,
}) {
  return [
    {
      method: "search.tripsSearch",
      params: {
        brand: "WAK",
        limit,
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
        countryId: countryIds,
        regionId: [],
        cityId: [],
        hotelId: [],
        roundTripId: [],
        cruiseId: [],
        searchType: "wczasy",
        offersAttributes: [],
        alternative: { countryId: [], regionId: [], cityId: [] },
        qsVersion: "cx_v2_auction",
        query: {
          campTypes: [],
          qsVersion: "cx_v2_auction",
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
          departureDate,
          arrivalDate,
          departure: departureIds,
          type: [],
          duration: { min: durationMin, max: durationMax },
          minPrice: null,
          maxPrice: null,
          service,
          firstminute: null,
          attribute: attributes,
          promotion: [],
          tourId: null,
          search: null,
          minCategory: null,
          maxCategory: 50,
          sort,
          order,
          totalPrice: true,
          rank: null,
          withoutTours: [],
          withoutCountry: [],
          withoutTrips: [],
          rooms: [{ adult: adults, kid: kids, ages: kidAges }],
          offerCode: null,
          dedicatedOffer: false,
        },
        durationMin: String(durationMin),
      },
    },
  ];
}

/**
 * Low-level HTTPS POST that bypasses Node fetch's TLS fingerprint issues.
 */
function httpsPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = Buffer.from(body, "utf-8");

    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: { ...headers, "Content-Length": data.length },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          resolve({ status: res.statusCode, body: raw });
        });
      }
    );

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

/**
 * Fetch a single page of offers.
 * @param {object[]} requestBody - from buildSearchRequest()
 * @returns {Promise<{count: number, offers: object[]}>}
 */
export async function fetchOffers(requestBody) {
  const { status, body } = await httpsPost(
    API_URL,
    JSON.stringify(requestBody),
    HEADERS
  );

  if (status !== 200) {
    throw new Error(`HTTP ${status}: ${body.slice(0, 200)}`);
  }

  const json = JSON.parse(body);

  if (!json.success) {
    throw new Error(
      `API error: ${json.error?.message || JSON.stringify(json.error)}`
    );
  }

  return json.data;
}

/**
 * Fetch all offers across all pages.
 * @param {object} searchOpts - same as buildSearchRequest()
 * @param {object} [paginationOpts]
 * @param {number} [paginationOpts.limitPerPage=50]
 * @param {number} [paginationOpts.maxPages] - stop after N pages (undefined = all)
 * @param {number} [paginationOpts.delayMs=1000] - ms between requests
 * @param {(info: {page: number, total: number, fetched: number}) => void} [paginationOpts.onProgress]
 * @returns {Promise<{totalCount: number, offers: object[], fetchedAt: string, searchParams: object}>}
 */
export async function fetchAllOffers(searchOpts, paginationOpts = {}) {
  const {
    limitPerPage = 50,
    maxPages,
    delayMs = 1000,
    onProgress,
  } = paginationOpts;

  const allOffers = [];
  let page = 1;
  let totalCount = null;

  while (true) {
    const body = buildSearchRequest({
      ...searchOpts,
      page,
      limit: limitPerPage,
    });

    const data = await fetchOffers(body);

    if (totalCount === null) {
      totalCount = data.count;
    }

    allOffers.push(...data.offers);

    const totalPages = Math.ceil(totalCount / limitPerPage);
    if (onProgress) {
      onProgress({ page, total: totalPages, fetched: allOffers.length });
    }

    if (data.offers.length === 0 || allOffers.length >= totalCount) break;
    if (maxPages && page >= maxPages) break;

    page++;
    await sleep(delayMs);
  }

  return {
    totalCount: totalCount ?? 0,
    fetchedCount: allOffers.length,
    offers: allOffers,
    fetchedAt: new Date().toISOString(),
    searchParams: { ...searchOpts },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
