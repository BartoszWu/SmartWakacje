import https from "node:https";
import type { Offer, ScraperConfig } from "@smartwakacje/shared";

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;

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
          minPrice: null,
          maxPrice: null,
          service: [config.service],
          firstminute: null,
          attribute: ["29"],
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
    req.on("error", reject);
    req.end(data);
  });
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
    promoLastMinute: o.promoLastMinute,
    promoFirstMinute: o.promoFirstMinute,
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

export async function scrapeOffers(
  config: ScraperConfig,
  onProgress?: (page: number, totalPages: number, fetched: number, total: number) => void
): Promise<ScrapeResult> {
  const first = await post(buildBody(config, 1));
  if (!first) throw new Error("No data returned from API");

  const total = first.count;
  const totalPages = Math.ceil(total / config.pageSize);
  onProgress?.(1, totalPages, first.offers.length, total);

  const pageResults: WakacjeOffer[][] = new Array(totalPages);
  pageResults[0] = first.offers as WakacjeOffer[];

  for (let b = 1; b < totalPages; b += BATCH_SIZE) {
    const batch: number[] = [];
    for (let p = b; p < Math.min(b + BATCH_SIZE, totalPages); p++) {
      batch.push(p + 1);
    }

    const results = await Promise.all(batch.map((p) => post(buildBody(config, p))));
    for (let i = 0; i < results.length; i++) {
      const p = batch[i];
      pageResults[p - 1] = results[i]?.offers as WakacjeOffer[];
      const fetched = pageResults.reduce((s, r) => s + (r ? r.length : 0), 0);
      onProgress?.(p, totalPages, fetched, total);
    }

    if (b + BATCH_SIZE < totalPages) await sleep(BATCH_DELAY_MS);
  }

  const allOffers = pageResults.flat();
  const parsed = allOffers.map((o) => parseOffer(config, o));

  return { raw: allOffers, parsed, totalCount: total };
}
