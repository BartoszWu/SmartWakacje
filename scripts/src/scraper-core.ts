import https from "node:https";
import type { Offer, ScraperConfig } from "@smartwakacje/shared";
import { COUNTRY_IDS } from "@smartwakacje/shared";

const COUNTRY_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(COUNTRY_IDS).map(([name, id]) => [id, name]),
);

const BATCH_SIZE = 5;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

interface ApiResponse {
  success: boolean;
  error?: { message: string };
  data?: {
    count: number;
    offers: WakacjeOffer[];
  };
}

interface WakacjeOffer {
  id: number;
  hotelId?: number;
  name: string;
  placeName: string;
  urlName: string;
  offerId: number;
  place?: {
    country?: { name: string; urlName: string };
    region?: { name: string; urlName: string };
    city?: { name: string; urlName: string };
  };
  duration: number;
  departureDate: string;
  returnDate: string;
  ratingString?: string;
  ratingValue: number;
  ratingRecommends: number;
  ratingReservationCount: number;
  price: number;
  priceOld?: number;
  priceDiscount?: number;
  category: number;
  service: number;
  serviceDesc: string;
  tourOperatorName: string;
  tourOperator?: number;
  offerHash?: string;
  departurePlace?: string;
  departureTypeName?: string;
  promoLastMinute: boolean;
  promoFirstMinute: boolean;
  employeeRatingCount?: number;
  photos?: Record<string, string[]>;
}

const SERVICE_URL: Record<number, string> = {
  1: "all-inclusive",
  2: "half-board",
  3: "full-board",
  4: "bed-and-breakfast",
};

function buildBody(config: ScraperConfig, page: number) {
  return [
    {
      method: "search.tripsSearch",
      params: {
        brand: "WAK",
        limit: config.pageSize,
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
        countryId: config.countries.map(String),
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
          departureDate: config.departureDateFrom,
          arrivalDate: config.departureDateTo,
          departure: config.airports,
          type: [],
          duration: { min: 7, max: 28 },
          minPrice: config.minPrice ?? null,
          maxPrice: config.maxPrice ?? null,
          service: [config.service],
          firstminute: null,
          attribute: config.attributes.map(String),
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
          rooms: [
            {
              adult: config.adults,
              kid: config.children,
              ages: config.childAges,
            },
          ],
          offerCode: null,
          dedicatedOffer: false,
        },
        durationMin: "7",
      },
    },
  ];
}

function post(body: unknown): Promise<ApiResponse["data"]> {
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
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          if (res.statusCode !== 200)
            return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          const json: ApiResponse = JSON.parse(raw);
          if (!json.success)
            return reject(new Error(`API: ${json.error?.message}`));
          resolve(json.data);
        });
      }
    );
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error("wakacje.pl request timeout"));
    });
    req.on("error", reject);
    req.end(data);
  });
}

async function postWithRetry(body: unknown, label: string): Promise<ApiResponse["data"]> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await post(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) {
        const delay = (attempt + 1) * 1000;
        console.warn(`  [Scraper] ${label} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${msg}, retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
  throw new Error("unreachable");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildOfferUrl(config: ScraperConfig, o: WakacjeOffer): string | null {
  const country = o.place?.country?.urlName;
  const region = o.place?.region?.urlName;
  const city = o.place?.city?.urlName;
  if (!country || !region || !city) return null;

  const slug = `${o.urlName}-${o.offerId}`;
  const svc = SERVICE_URL[o.service] || "all-inclusive";
  const room = config.childAges.join("-");

  const qs = [
    `od-${o.departureDate}`,
    `${o.duration}-dni`,
    svc,
    "z-katowic",
    "srcx",
    `${config.adults}dorosle-${config.children}dzieci-${room}`,
  ].join(",");

  return `https://www.wakacje.pl/oferty/${country}/${region}/${city}/${slug}.html?${qs}`;
}

function parseOffer(config: ScraperConfig, o: WakacjeOffer): Offer {
  return {
    id: String(o.id),
    hotelId: o.hotelId ?? undefined,
    name: o.name,
    placeName: o.placeName,
    url: buildOfferUrl(config, o) || "",
    country: o.place?.country?.name || "",
    region: o.place?.region?.name || "",
    city: o.place?.city?.name || "",
    duration: o.duration,
    departureDate: o.departureDate,
    returnDate: o.returnDate,
    ratingValue: o.ratingValue,
    ratingRecommends: o.ratingRecommends,
    ratingReservationCount: o.ratingReservationCount,
    employeeRatingCount: o.employeeRatingCount || 0,
    price: o.price,
    pricePerPerson: Math.round(o.price / (config.adults + config.children)),
    priceOld: o.priceOld || null,
    priceDiscount: o.priceDiscount || null,
    category: o.category,
    serviceDesc: o.serviceDesc,
    tourOperator: o.tourOperatorName,
    offerHash: o.offerHash ?? null,
    tourOperatorId: o.tourOperator ?? null,
    departurePlace: o.departurePlace ?? null,
    departureTypeName: o.departureTypeName ?? null,
    roomType: (o as Record<string, unknown>).roomType as string ?? null,
    tourOpCode: o.offerHash?.split(":")[0] ?? null,
    promoLastMinute: o.promoLastMinute,
    promoFirstMinute: o.promoFirstMinute,
    photos: (o.photos?.["570,428"] ?? []).map(p => `https://www.wakacje.pl${p}`),
    photo: o.photos?.["570,428"]?.[0]
      ? `https://www.wakacje.pl${o.photos["570,428"][0]}`
      : "",
  };
}

export interface ScrapeResult {
  raw: WakacjeOffer[];
  parsed: Offer[];
  totalCount: number;
}

async function scrapeCountry(
  config: ScraperConfig,
  onProgress?: (page: number, totalPages: number, fetched: number, total: number, countryName?: string) => void,
  countryName?: string,
): Promise<{ raw: WakacjeOffer[]; count: number }> {
  const first = await postWithRetry(buildBody(config, 1), "page 1");
  if (!first) return { raw: [], count: 0 };

  const total = first.count;
  const totalPages = Math.ceil(total / config.pageSize);
  const delay = config.delayBetweenPages ?? 500;
  onProgress?.(1, totalPages, first.offers.length, total, countryName);

  const pageResults: (WakacjeOffer[] | null)[] = new Array(totalPages).fill(null);
  pageResults[0] = first.offers as WakacjeOffer[];

  for (let b = 1; b < totalPages; b += BATCH_SIZE) {
    const batch: number[] = [];
    for (let p = b; p < Math.min(b + BATCH_SIZE, totalPages); p++) {
      batch.push(p + 1);
    }

    const results = await Promise.allSettled(
      batch.map((p) => postWithRetry(buildBody(config, p), `page ${p}`))
    );
    for (let i = 0; i < results.length; i++) {
      const p = batch[i];
      const r = results[i];
      if (r.status === "fulfilled") {
        pageResults[p - 1] = r.value?.offers as WakacjeOffer[];
      } else {
        console.warn(`  [Scraper] page ${p}/${totalPages} failed permanently: ${r.reason?.message ?? r.reason}`);
      }
      const fetched = pageResults.reduce((s, arr) => s + (arr ? arr.length : 0), 0);
      onProgress?.(p, totalPages, fetched, total, countryName);
    }

    if (b + BATCH_SIZE < totalPages) await sleep(delay);
  }

  const failedPages = pageResults.filter((r) => r === null).length;
  if (failedPages > 0) {
    console.warn(`  [Scraper] ${failedPages}/${totalPages} pages failed, continuing with partial results`);
  }

  return { raw: pageResults.filter(Boolean).flat() as WakacjeOffer[], count: total };
}

export async function scrapeOffers(
  config: ScraperConfig,
  onProgress?: (page: number, totalPages: number, fetched: number, total: number, countryName?: string) => void
): Promise<ScrapeResult> {
  const allRaw: WakacjeOffer[] = [];
  let totalCount = 0;

  // Scrape each country separately to avoid API silently dropping countries
  for (const countryId of config.countries) {
    const countryName = COUNTRY_NAMES[countryId] ?? `ID ${countryId}`;
    const countryConfig = { ...config, countries: [countryId] };
    const result = await scrapeCountry(countryConfig, onProgress, countryName);
    allRaw.push(...result.raw);
    totalCount += result.count;
  }

  // Deduplicate by offer id
  const seen = new Set<number>();
  const dedupedRaw = allRaw.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });

  const parsed = dedupedRaw.map((o) => parseOffer(config, o));
  return { raw: dedupedRaw, parsed, totalCount };
}
