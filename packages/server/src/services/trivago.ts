import https from "node:https";
import { normalizeName } from "@smartwakacje/shared";
import type { TrivagoSearchResult, TrivagoAspects } from "@smartwakacje/shared";

const SEARCH_HASH = "ea6de51e563394c4768a3a0ef0f67e7307c910ed29e4824896f36c95d5d159fd";

function trivagoPost(path: string, body: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const req = https.request(
      {
        hostname: "www.trivago.pl",
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": payload.length,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
          Origin: "https://www.trivago.pl",
          Referer: "https://www.trivago.pl/",
          "apollographql-client-name": "hs-web-app",
          "apollographql-client-version": "cafd1354",
          "x-trv-app-id": "HS_WEB_APP_WARP",
          "x-trv-language": "pl",
          "x-trv-platform": "pl",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          if (res.statusCode !== 200)
            return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error(`Invalid JSON: ${raw.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function trivagoGet(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    function doGet(p: string) {
      https
        .get(
          {
            hostname: "www.trivago.pl",
            path: p,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml",
              "Accept-Language": "pl-PL,pl;q=0.9",
            },
          },
          (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
              const loc = res.headers["location"];
              if (!loc) return reject(new Error("Redirect without Location header"));
              res.resume();
              try {
                const u = new URL(loc);
                doGet(u.pathname + u.search);
              } catch {
                reject(new Error(`Bad redirect URL: ${loc}`));
              }
              return;
            }
            const chunks: Buffer[] = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => resolve(Buffer.concat(chunks).toString()));
          }
        )
        .on("error", reject);
    }
    doGet(path);
  });
}

async function searchTrivagoConcept(
  name: string
): Promise<{ nsid: number; name: string; locationLabel: string } | null> {
  const clean = normalizeName(name);
  const data = (await trivagoPost("/graphql?getSearchSuggestions", {
    variables: {
      input: {
        query: clean,
        spellingCorrection: true,
        previousQueries: [],
        enableAlternativeSuggestions: false,
      },
    },
    operationName: "getSearchSuggestions",
    extensions: {
      persistedQuery: { version: 1, sha256Hash: SEARCH_HASH },
    },
  })) as {
    data?: {
      getSearchSuggestions?: {
        unifiedSearchSuggestions?: Array<{
          concept?: {
            nsid?: { ns?: number; id?: number };
            translatedName?: { value?: string };
            locationLabel?: string;
          };
        }>;
      };
    };
  };

  const suggestions = data?.data?.getSearchSuggestions?.unifiedSearchSuggestions ?? [];
  for (const s of suggestions) {
    const c = s.concept;
    if (c?.nsid?.ns === 100 && c.nsid.id) {
      return {
        nsid: c.nsid.id,
        name: c.translatedName?.value ?? "",
        locationLabel: c.locationLabel ?? "",
      };
    }
  }
  return null;
}

const ASPECT_MAP: Record<string, keyof TrivagoAspects> = {
  Czystość: "cleanliness",
  Lokalizacja: "location",
  Komfort: "comfort",
  "Jakość a cena": "valueForMoney",
  Obsługa: "service",
  Jedzenie: "food",
  Pokoje: "rooms",
};

async function fetchTrivagoRatingsByNsid(nsid: number): Promise<{
  rating: number | null;
  reviewsCount: number | null;
  trivagoUrl: string;
  aspects: TrivagoAspects | null;
}> {
  const html = await trivagoGet(`/pl/oar/hotel?search=100-${nsid}`);

  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("No __NEXT_DATA__ found on page");

  const parsed = JSON.parse(m[1]) as {
    props?: {
      pageProps?: {
        initialState?: {
          gqlApi?: {
            queries?: Record<string, unknown>;
          };
        };
      };
    };
  };

  const queries = parsed?.props?.pageProps?.initialState?.gqlApi?.queries ?? {};

  const detKey = Object.keys(queries).find((k) => k.startsWith("accommodationDetails("));
  const detEntry = detKey
    ? ((queries[detKey] as { data?: unknown[][] })?.data?.[0]?.[1] as {
        reviewRating?: { formattedRating?: string; reviewsCount?: number };
        userFriendlyUrl?: { url?: string };
      } | null)
    : null;
  const reviewRating = detEntry?.reviewRating ?? null;

  const ratKey = Object.keys(queries).find((k) => k.startsWith("accommodationRatings("));
  const ratEntry = ratKey
    ? ((queries[ratKey] as { data?: unknown[][] })?.data?.[0]?.[1] as {
        aspectRatings?: Array<{ translatedName?: { value?: string }; value?: number }>;
      } | null)
    : null;
  const aspectRatings = ratEntry?.aspectRatings ?? [];

  const aspects: TrivagoAspects = {};
  for (const ar of aspectRatings) {
    const key = ASPECT_MAP[ar.translatedName?.value || ""];
    if (key && ar.value) aspects[key] = Math.round((ar.value / 1000) * 10) / 10;
  }

  const urlSlug = detEntry?.userFriendlyUrl?.url ?? null;
  const trivagoUrl = urlSlug
    ? `https://www.trivago.pl${urlSlug}`
    : `https://www.trivago.pl/pl/oar/hotel?search=100-${nsid}`;

  return {
    rating: reviewRating?.formattedRating ? parseFloat(reviewRating.formattedRating) : null,
    reviewsCount: reviewRating?.reviewsCount ?? null,
    trivagoUrl,
    aspects: Object.keys(aspects).length > 0 ? aspects : null,
  };
}

export async function searchTrivago(name: string): Promise<TrivagoSearchResult[]> {
  const concept = await searchTrivagoConcept(name);
  if (!concept) return [];

  const ratings = await fetchTrivagoRatingsByNsid(concept.nsid);

  return [
    {
      nsid: concept.nsid,
      name: concept.name,
      locationLabel: concept.locationLabel,
      rating: ratings.rating,
      reviewsCount: ratings.reviewsCount,
      trivagoUrl: ratings.trivagoUrl,
      aspects: ratings.aspects,
    },
  ];
}
