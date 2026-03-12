import https from "node:https";
import type { Offer, DescriptionSection, DescriptionCacheEntry, ScraperConfig, OfferVariant } from "@smartwakacje/shared";

const REQUEST_TIMEOUT_MS = 15_000;
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function httpRequest(options: https.RequestOptions, body?: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

    const timer = setTimeout(() => {
      done(() => { req.destroy(); reject(new Error("wakacje.pl request timeout")); });
    }, REQUEST_TIMEOUT_MS);

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        clearTimeout(timer);
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode !== 200)
          return done(() => reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 300)}`)));
        try {
          done(() => resolve(JSON.parse(raw)));
        } catch {
          done(() => reject(new Error(`Invalid JSON: ${raw.slice(0, 200)}`)));
        }
      });
    });

    req.on("error", (err) => {
      clearTimeout(timer);
      done(() => reject(err));
    });

    if (body) req.end(body);
    else req.end();
  });
}

interface FlightPoint {
  code?: string;
  name?: string;
  date?: string;
  time?: string;
}

interface CalculatorVariant {
  id?: string;
  tourOp?: string;
  departureDate?: string;
  departStart?: FlightPoint;
  departEnd?: FlightPoint;
  returnStart?: FlightPoint;
  returnEnd?: FlightPoint;
  roomDesc?: string;
  price?: number;
  departureCityId?: number;
}

interface VariantResponse {
  data?: {
    offers?: Array<CalculatorVariant>;
  };
}

export async function fetchOfferVariants(
  offerId: string,
  params: {
    adults: number;
    kids: number;
    kidsAges: string[];
    serviceId: number;
    duration: number;
    departureDate: string;
    transportId?: number;
    departureCityId?: number;
    hotelId?: number;
    tourOp?: string;
    tourId?: number;
  }
): Promise<{ offerHash: string; providerCode: string } | null> {
  const body = JSON.stringify({
    adults: params.adults,
    kids: params.kids,
    kidsAges: params.kidsAges,
    serviceId: params.serviceId,
    duration: params.duration,
    departureDate: params.departureDate,
    transportId: params.transportId ?? 1,
    departureCityId: params.departureCityId ?? 32,
    hotelId: params.hotelId,
    tourOp: params.tourOp,
    tourId: params.tourId,
    infants: 0,
    cruiseId: 0,
    roundTripId: 0,
    isAlternativeRoom: false,
    isOffer77: false,
  });

  const data = await httpRequest({
    hostname: "www.wakacje.pl",
    path: `/v2/api/getCalculatorOfferVariants/${offerId}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      Origin: "https://www.wakacje.pl",
      Referer: "https://www.wakacje.pl/wczasy/",
    },
  }, body) as VariantResponse;

  const variant = data?.data?.offers?.[0];
  if (!variant?.id || !variant?.tourOp) return null;

  return { offerHash: variant.id, providerCode: variant.tourOp };
}

interface ConfiguratorVariantResponse {
  data?: {
    offers?: Array<{
      id?: string;
      departureDate?: string;
      returnDate?: string;
      departureName?: string;
      duration?: number;
      numberOfNights?: number;
      price?: number;
      currency?: string;
      serviceDesc?: string;
      departurePlace?: number;
      transportType?: number;
      labels?: {
        stayLabel?: string;
        durationLabel?: string;
        transportTypeLabel?: string;
        departurePlaceLabel?: string;
        serviceDescLabel?: string;
        priceLabel?: string;
      };
    }>;
  };
}

export async function fetchAllVariants(
  offerId: string,
  params: {
    adults: number;
    kidsAges: string[];
    month?: number;
    duration?: string[];
    departurePlace?: number[];
  }
): Promise<OfferVariant[]> {
  const departureDateFilter: string[] = [];
  if (params.month) {
    const year = new Date().getFullYear();
    const mm = String(params.month).padStart(2, "0");
    const lastDay = new Date(year, params.month, 0).getDate();
    departureDateFilter.push(`${year}-${mm}-01:${year}-${mm}-${String(lastDay).padStart(2, "0")}`);
  }

  const body = JSON.stringify({
    offerId: Number(offerId),
    departureDate: departureDateFilter,
    duration: params.duration ?? [],
    adults: params.adults,
    kidsAges: params.kidsAges,
    service: [],
    transportType: [],
    departurePlace: params.departurePlace ?? [],
    providerIds: [],
    limit: 1000,
    orderBy: "departureDate",
  });

  const data = await httpRequest({
    hostname: "www.wakacje.pl",
    path: "/v2/api/offerConfiguratorV2/offerVariants",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      Origin: "https://www.wakacje.pl",
      Referer: "https://www.wakacje.pl/wczasy/",
    },
  }, body) as ConfiguratorVariantResponse;

  const offers = data?.data?.offers ?? [];
  const mapped = offers
    .filter((o) => o.id && o.price)
    .map((o) => ({
      id: o.id!,
      serviceDesc: o.serviceDesc ?? "",
      duration: o.duration ?? 0,
      numberOfNights: o.numberOfNights ?? 0,
      totalPrice: o.price!,
      departureCity: o.departureName ?? "",
      departureDate: o.departureDate ?? "",
      returnDate: o.returnDate ?? "",
    }));

  return mapped;
}

export async function fetchVariantFlightTimes(
  offerId: string,
  params: {
    adults: number;
    kidsAges: string[];
    serviceId: number;
    duration: number;
    departureDate: string;
    departureCityId: number;
    hotelId: number;
    tourOp: string;
    tourId: number;
  }
): Promise<CalculatorVariant[]> {
  const body = JSON.stringify({
    adults: params.adults,
    kids: 0,
    kidsAges: params.kidsAges,
    serviceId: params.serviceId,
    duration: params.duration,
    departureDate: params.departureDate,
    transportId: 1,
    departureCityId: params.departureCityId,
    hotelId: params.hotelId,
    tourOp: params.tourOp,
    tourId: params.tourId,
    infants: 0,
    cruiseId: 0,
    roundTripId: 0,
    isAlternativeRoom: false,
    isOffer77: false,
  });

  const data = await httpRequest({
    hostname: "www.wakacje.pl",
    path: `/v2/api/getCalculatorOfferVariants/${offerId}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      Origin: "https://www.wakacje.pl",
      Referer: "https://www.wakacje.pl/wczasy/",
    },
  }, body) as VariantResponse;

  return data?.data?.offers ?? [];
}

// City name → departureCityId mapping (common Polish airports)
const CITY_ID_MAP: Record<string, number> = {
  "Warszawa": 32,
  "Katowice": 12,
  "Krakow": 14, "Kraków": 14,
  "Wroclaw": 33, "Wrocław": 33,
  "Poznan": 24, "Poznań": 24,
  "Gdansk": 6, "Gdańsk": 6,
  "Szczecin": 28,
  "Lodz": 15, "Łódź": 15,
  "Bydgoszcz": 3,
  "Rzeszow": 26, "Rzeszów": 26,
  "Lublin": 16,
  "Olsztyn": 21,
  "Zielona Gora": 34, "Zielona Góra": 34,
  "Radom": 25,
};

function getCityId(cityName: string): number | null {
  return CITY_ID_MAP[cityName] ?? null;
}

export async function enrichVariantsWithFlightTimes(
  offerId: string,
  variants: OfferVariant[],
  offerDetails: { hotelId: number; tourOp: string; tourId: number },
  participants: { adults: number; kidsAges: string[] },
  maxGroups = 40
): Promise<OfferVariant[]> {
  // Group by unique (departureDate, departureCity, duration) triples
  const groups = new Map<string, { departureDate: string; cityName: string; cityId: number; duration: number }>();
  const unmapped = new Set<string>();
  for (const v of variants) {
    const cityId = getCityId(v.departureCity);
    if (!cityId) { unmapped.add(v.departureCity); continue; }
    const key = `${v.departureDate}|${cityId}|${v.duration}`;
    if (!groups.has(key)) {
      groups.set(key, {
        departureDate: v.departureDate,
        cityName: v.departureCity,
        cityId,
        duration: v.duration,
      });
    }
  }

  // Deduplicate: for each (date, city) keep only the most common duration
  // This drastically reduces API calls (e.g. 219 → ~30)
  const dateCity = new Map<string, Map<number, number>>(); // dateCityKey → duration → count
  for (const [, g] of groups) {
    const dc = `${g.departureDate}|${g.cityId}`;
    if (!dateCity.has(dc)) dateCity.set(dc, new Map());
    const durMap = dateCity.get(dc)!;
    durMap.set(g.duration, (durMap.get(g.duration) ?? 0) + 1);
  }

  // Build deduplicated entries: one per (date, city) with the most common duration
  const dedupEntries: [string, { departureDate: string; cityId: number; duration: number }][] = [];
  for (const [dc, durMap] of dateCity) {
    const [date, cityIdStr] = dc.split("|");
    const cityId = Number(cityIdStr);
    // Pick duration with highest count
    let bestDur = 7, bestCount = 0;
    for (const [dur, cnt] of durMap) {
      if (cnt > bestCount) { bestDur = dur; bestCount = cnt; }
    }
    dedupEntries.push([dc, { departureDate: date, cityId, duration: bestDur }]);
  }

  const cappedEntries = dedupEntries.slice(0, maxGroups);

  // Fetch flight times with concurrency limit
  const flightMap = new Map<string, CalculatorVariant>();
  let idx = 0;
  async function worker() {
    while (idx < cappedEntries.length) {
      const i = idx++;
      const [dcKey, g] = cappedEntries[i];
      try {
        const calcVariants = await fetchVariantFlightTimes(offerId, {
          adults: participants.adults,
          kidsAges: participants.kidsAges,
          serviceId: 1,
          duration: g.duration,
          departureDate: g.departureDate,
          departureCityId: g.cityId,
          hotelId: offerDetails.hotelId,
          tourOp: offerDetails.tourOp,
          tourId: offerDetails.tourId,
        });
        const withFlight = calcVariants.find((v) => v.departStart?.time) ?? calcVariants[0];
        if (withFlight) {
          flightMap.set(dcKey, withFlight);
        }
      } catch {
        // skip failed
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, cappedEntries.length) }, () => worker()));

  // Enrich variants — lookup by (date, city), flight times apply regardless of duration
  return variants.map((v) => {
    const cityId = getCityId(v.departureCity);
    if (!cityId) return v;
    const key = `${v.departureDate}|${cityId}`;
    const flight = flightMap.get(key);
    if (!flight) return v;
    return {
      ...v,
      departureTime: flight.departStart?.time,
      arrivalTime: flight.departEnd?.time,
      returnDepartTime: flight.returnStart?.time,
      returnArrivalTime: flight.returnEnd?.time,
      roomDesc: flight.roomDesc,
    };
  });
}

interface DescriptionResponse {
  data?: {
    descriptions?: Array<{ label: string; value: string }>;
  };
}

export async function fetchDescription(
  longOfferHash: string,
  providerCode: string,
  participants: { adults: number; kids: number; kidsAges: string[] }
): Promise<DescriptionSection[]> {
  const url = new URL("https://www.wakacje.pl/v2/api/getDescription");
  url.searchParams.set("category", "tour");
  url.searchParams.set("offerHash", longOfferHash);
  url.searchParams.set("providerCode", providerCode);

  // Build individual participant entries as expected by the API
  let idx = 0;
  for (let i = 0; i < participants.adults; i++, idx++) {
    url.searchParams.set(`data[participants][${idx}][type]`, "adult");
    url.searchParams.set(`data[participants][${idx}][birthDate]`, "1988-01-01");
  }
  for (let i = 0; i < participants.kidsAges.length; i++, idx++) {
    // kidsAges are in YYYYMMDD format, convert to YYYY-MM-DD
    const raw = participants.kidsAges[i];
    const birthDate = raw.length === 8
      ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
      : raw;
    url.searchParams.set(`data[participants][${idx}][type]`, "child");
    url.searchParams.set(`data[participants][${idx}][birthDate]`, birthDate);
  }

  const data = await httpRequest({
    hostname: url.hostname,
    path: `${url.pathname}?${url.searchParams.toString()}`,
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      Referer: "https://www.wakacje.pl/wczasy/",
    },
  }) as DescriptionResponse;

  return (data?.data?.descriptions ?? []).map((d) => ({
    label: d.label,
    value: d.value,
  }));
}

interface FacilitiesResponse {
  data?: {
    hotelFacilities?: { title: string; item: string[] };
    hotelAttractions?: { title: string; item: string[] };
  };
}

export async function fetchFacilities(hotelId: number): Promise<{
  hotelFacilities: { title: string; item: string[] };
  hotelAttractions: { title: string; item: string[] };
} | null> {
  const data = await httpRequest({
    hostname: "www.wakacje.pl",
    path: `/v2/api/getFacilities/${hotelId}`,
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      Referer: "https://www.wakacje.pl/wczasy/",
    },
  }) as FacilitiesResponse;

  if (!data?.data?.hotelFacilities && !data?.data?.hotelAttractions) return null;

  return {
    hotelFacilities: data.data?.hotelFacilities ?? { title: "", item: [] },
    hotelAttractions: data.data?.hotelAttractions ?? { title: "", item: [] },
  };
}

export async function fetchHotelDescription(
  offer: Offer,
  config: { adults: number; kids: number; kidsAges: string[]; departureCityId: number }
): Promise<DescriptionCacheEntry> {
  // Extract tourOp from offerHash (format: "PROVIDER:rest")
  const tourOp = offer.offerHash?.split(":")[0];

  // Step 1: get variants to obtain long offerHash
  const variant = await fetchOfferVariants(offer.id, {
    adults: config.adults,
    kids: config.kids,
    kidsAges: config.kidsAges,
    serviceId: 1, // all-inclusive
    duration: offer.duration,
    departureDate: offer.departureDate,
    transportId: 1, // airplane
    departureCityId: config.departureCityId,
    hotelId: offer.hotelId,
    tourOp,
    tourId: offer.tourOperatorId,
  });

  if (!variant) {
    throw new Error("No variants returned for offer");
  }

  // Step 2: fetch description + facilities in parallel
  const [descriptions, facilities] = await Promise.all([
    fetchDescription(variant.offerHash, variant.providerCode, config),
    offer.hotelId ? fetchFacilities(offer.hotelId).catch(() => null) : Promise.resolve(null),
  ]);

  return {
    descriptions,
    facilities: facilities ?? undefined,
    fetchedAt: new Date().toISOString(),
  };
}
