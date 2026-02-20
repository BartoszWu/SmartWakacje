import { createServer } from "node:http";
import https from "node:https";
import {
  readFileSync, writeFileSync, readdirSync,
  existsSync, statSync, mkdirSync,
} from "node:fs";
import { join, extname } from "node:path";

const PORT = 3000;
const ROOT = join(import.meta.dirname, "..");
const DATA_DIR = join(ROOT, "data");
const CACHE_FILE = join(DATA_DIR, "google-ratings-cache.json");

// ── .env loader ─────────────────────────────────────────────
(function loadEnv() {
  try {
    const txt = readFileSync(join(ROOT, ".env"), "utf-8");
    for (const line of txt.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const idx = t.indexOf("=");
      if (idx === -1) continue;
      const key = t.slice(0, idx).trim();
      const val = t.slice(idx + 1).trim();
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch { /* .env not found — rely on env vars */ }
})();

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const TA_API_KEY = process.env.TRIPADVISOR_API_KEY || "";
const TA_CACHE_FILE = join(DATA_DIR, "ta-ratings-cache.json");
const TRIVAGO_CACHE_FILE = join(DATA_DIR, "trivago-ratings-cache.json");
const TRIVAGO_SEARCH_HASH = "ea6de51e563394c4768a3a0ef0f67e7307c910ed29e4824896f36c95d5d159fd";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const COUNTRY_EN = {
  Tunezja: "Tunisia", Turcja: "Turkey", Egipt: "Egypt",
  Grecja: "Greece", Hiszpania: "Spain", Chorwacja: "Croatia",
  "Bułgaria": "Bulgaria", Cypr: "Cyprus", Maroko: "Morocco",
  Portugalia: "Portugal", "Włochy": "Italy", "Czarnogóra": "Montenegro",
  Albania: "Albania", Malta: "Malta",
};

// ── Helpers ──────────────────────────────────────────────────

const DATA_FILE = join(DATA_DIR, "data.json");

/** Returns path to data.json (enriched) or newest offers_*.json as fallback */
function findLatestOffers() {
  if (existsSync(DATA_FILE)) return DATA_FILE;
  if (!existsSync(DATA_DIR)) return null;
  const files = readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
    .map((f) => ({ name: f, mtime: statSync(join(DATA_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length ? join(DATA_DIR, files[0].name) : null;
}

/** Load cache from disk */
function loadCache() {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

/** Save cache to disk */
function saveCache(cache) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/** Strip parenthesized parts: "Long Beach (Avsallar)" → "Long Beach" */
function normalizeName(name) {
  return name.replace(/\s*\(.*?\)\s*/g, " ").trim();
}

/** HTTPS GET → parsed JSON */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode !== 200)
          return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
        resolve(JSON.parse(raw));
      });
    }).on("error", reject);
  });
}

/** Parse request body as JSON */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

/** Send JSON response */
function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

// ── TripAdvisor helpers ──────────────────────────────────────

function loadTaCache() {
  try { return JSON.parse(readFileSync(TA_CACHE_FILE, "utf-8")); }
  catch { return {}; }
}

function saveTaCache(cache) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(TA_CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function fetchTaDetails(locationId) {
  const url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?key=${TA_API_KEY}&language=en`;
  const data = await httpGet(url);
  return {
    rating: data.rating ? parseFloat(data.rating) : null,
    numReviews: data.num_reviews ? parseInt(data.num_reviews) : null,
    taUrl: data.web_url || null,
  };
}

async function searchTa(name, city, country) {
  const cleanName = normalizeName(name);
  const countryEn = COUNTRY_EN[country] || country || "";
  const query = `${cleanName} ${city || ""} ${countryEn}`.trim();

  const url = new URL("https://api.content.tripadvisor.com/api/v1/location/search");
  url.searchParams.set("key", TA_API_KEY);
  url.searchParams.set("searchQuery", query);
  url.searchParams.set("category", "hotels");
  url.searchParams.set("language", "en");

  const searchData = await httpGet(url.toString());
  const candidates = searchData.data?.slice(0, 5) || [];
  if (!candidates.length) return [];

  // Fetch details sequentially to avoid 429
  const results = [];
  for (const loc of candidates) {
    const details = await fetchTaDetails(loc.location_id);
    results.push({
      locationId: loc.location_id,
      name: loc.name || "",
      address: [loc.address_obj?.street1, loc.address_obj?.city, loc.address_obj?.country]
        .filter(Boolean).join(", "),
      rating: details.rating,
      numReviews: details.numReviews,
      taUrl: details.taUrl,
    });
  }
  return results;
}

function updateTaInJSON(hotelName, result) {
  const file = findLatestOffers();
  if (!file) return;
  const offers = JSON.parse(readFileSync(file, "utf-8"));
  let changed = false;
  for (const o of offers) {
    if (o.name === hotelName) {
      o.taRating = result.rating;
      o.taReviewCount = result.numReviews;
      o.taUrl = result.taUrl;
      o.taLocationId = result.locationId;
      changed = true;
    }
  }
  if (changed) writeFileSync(file, JSON.stringify(offers, null, 2));
}

// ── Trivago helpers ──────────────────────────────────────────

function loadTrivagoCache() {
  try { return JSON.parse(readFileSync(TRIVAGO_CACHE_FILE, "utf-8")); }
  catch { return {}; }
}

function saveTrivagoCache(cache) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(TRIVAGO_CACHE_FILE, JSON.stringify(cache, null, 2));
}

/** POST to Trivago GraphQL, returns parsed JSON. */
function trivagoPost(path, body) {
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
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
          "Origin": "https://www.trivago.pl",
          "Referer": "https://www.trivago.pl/",
          "apollographql-client-name": "hs-web-app",
          "apollographql-client-version": "cafd1354",
          "x-trv-app-id": "HS_WEB_APP_WARP",
          "x-trv-language": "pl",
          "x-trv-platform": "pl",
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          if (res.statusCode !== 200)
            return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          try { resolve(JSON.parse(raw)); }
          catch { reject(new Error(`Invalid JSON: ${raw.slice(0, 200)}`)); }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

/** GET Trivago hotel page, following 301/302 redirect. Returns HTML. */
function trivagoGet(path) {
  return new Promise((resolve, reject) => {
    function doGet(p) {
      https.get(
        {
          hostname: "www.trivago.pl",
          path: p,
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
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
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks).toString()));
        }
      ).on("error", reject);
    }
    doGet(path);
  });
}

const TRIVAGO_ASPECT_MAP = {
  "Czystość": "cleanliness",
  "Lokalizacja": "location",
  "Komfort": "comfort",
  "Jakość a cena": "valueForMoney",
  "Obsługa": "service",
  "Jedzenie": "food",
  "Pokoje": "rooms",
};

async function searchTrivagoHotel(name) {
  const clean = normalizeName(name);
  const data = await trivagoPost("/graphql?getSearchSuggestions", {
    variables: { input: { query: clean, spellingCorrection: true, previousQueries: [], enableAlternativeSuggestions: false } },
    operationName: "getSearchSuggestions",
    extensions: { persistedQuery: { version: 1, sha256Hash: TRIVAGO_SEARCH_HASH } },
  });
  const suggestions = data?.data?.getSearchSuggestions?.unifiedSearchSuggestions ?? [];
  for (const s of suggestions) {
    const c = s.concept;
    if (c?.nsid?.ns === 100) {
      return { nsid: c.nsid.id, name: c.translatedName?.value ?? "", locationLabel: c.locationLabel ?? "" };
    }
  }
  return null;
}

async function fetchTrivagoRatingsForNsid(nsid) {
  const html = await trivagoGet(`/pl/oar/hotel?search=100-${nsid}`);
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("No __NEXT_DATA__ found on page");

  const queries = JSON.parse(m[1])?.props?.pageProps?.initialState?.gqlApi?.queries ?? {};

  const detKey = Object.keys(queries).find((k) => k.startsWith("accommodationDetails("));
  const detEntry = detKey ? queries[detKey]?.data?.[0]?.[1] : null;
  const reviewRating = detEntry?.reviewRating ?? null;

  const ratKey = Object.keys(queries).find((k) => k.startsWith("accommodationRatings("));
  const ratEntry = ratKey ? queries[ratKey]?.data?.[0]?.[1] : null;
  const aspectRatings = ratEntry?.aspectRatings ?? [];

  const aspects = {};
  for (const ar of aspectRatings) {
    const key = TRIVAGO_ASPECT_MAP[ar.translatedName?.value];
    if (key) aspects[key] = Math.round((ar.value / 1000) * 10) / 10;
  }

  const urlSlug = detEntry?.userFriendlyUrl?.url ?? null;
  return {
    rating: reviewRating ? parseFloat(reviewRating.formattedRating) : null,
    reviewsCount: reviewRating?.reviewsCount ?? null,
    trivago_url: urlSlug ? `https://www.trivago.pl${urlSlug}` : `https://www.trivago.pl/pl/oar/hotel?search=100-${nsid}`,
    aspects: Object.keys(aspects).length > 0 ? aspects : null,
  };
}

function updateTrivagoInJSON(hotelName, result) {
  const file = findLatestOffers();
  if (!file) return;
  const offers = JSON.parse(readFileSync(file, "utf-8"));
  let changed = false;
  for (const o of offers) {
    if (o.name === hotelName) {
      o.trivagoRating = result.rating;
      o.trivagoReviewsCount = result.reviewsCount;
      o.trivagoUrl = result.trivago_url;
      o.trivagoNsid = result.nsid;
      const asp = result.aspects ?? {};
      o.trivagoAspectCleanliness = asp.cleanliness ?? null;
      o.trivagoAspectLocation = asp.location ?? null;
      o.trivagoAspectComfort = asp.comfort ?? null;
      o.trivagoAspectValueForMoney = asp.valueForMoney ?? null;
      o.trivagoAspectService = asp.service ?? null;
      o.trivagoAspectFood = asp.food ?? null;
      o.trivagoAspectRooms = asp.rooms ?? null;
      changed = true;
    }
  }
  if (changed) writeFileSync(file, JSON.stringify(offers, null, 2));
}

// ── Google Places Text Search (Legacy) ──────────────────────

async function searchGoogle(name, city, country) {
  const cleanName = normalizeName(name);
  const countryEn = COUNTRY_EN[country] || country || "";
  const query = `${cleanName} hotel ${city || ""} ${countryEn}`.trim();

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", GOOGLE_API_KEY);
  url.searchParams.set("type", "lodging");
  url.searchParams.set("language", "en");

  const data = await httpGet(url.toString());

  if (data.status === "OK" && data.results?.length > 0) {
    return data.results.slice(0, 5).map((r) => ({
      name: r.name || "",
      rating: r.rating || 0,
      totalRatings: r.user_ratings_total || 0,
      address: r.formatted_address || "",
      placeId: r.place_id || "",
      mapsUrl: r.place_id
        ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}`
        : null,
    }));
  }

  return [];
}

// ── Server ───────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // ── API: offers list ──────────────────────────────────────
  if (path === "/api/offers" && req.method === "GET") {
    const file = findLatestOffers();
    if (!file) return json(res, 404, { error: "No offers_*.json found in data/" });
    res.writeHead(200, {
      "Content-Type": MIME[".json"],
      "Access-Control-Allow-Origin": "*",
    });
    res.end(readFileSync(file));
    return;
  }

  // ── API: google rating (with cache) ───────────────────────
  if (path === "/api/google-rating" && req.method === "GET") {
    const name = url.searchParams.get("name");
    const city = url.searchParams.get("city") || "";
    const country = url.searchParams.get("country") || "";

    if (!name) return json(res, 400, { error: "Missing 'name' param" });
    if (!GOOGLE_API_KEY) return json(res, 500, { error: "Missing GOOGLE_MAPS_API_KEY in .env" });

    const cache = loadCache();

    // Check cache
    if (cache[name]) {
      return json(res, 200, { results: cache[name].results, selected: cache[name].selected ?? null, fromCache: true });
    }

    // Fetch from Google
    try {
      const results = await searchGoogle(name, city, country);
      cache[name] = { results, selected: results.length === 1 ? 0 : null, fetchedAt: new Date().toISOString() };
      saveCache(cache);

      // If single result, also update offers JSON
      if (results.length === 1) {
        updateOfferInJSON(name, results[0]);
      }

      return json(res, 200, { results, selected: cache[name].selected, fromCache: false });
    } catch (err) {
      return json(res, 502, { error: err.message });
    }
  }

  // ── API: select google rating result ──────────────────────
  if (path === "/api/google-rating/select" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const { hotelName, selectedIndex } = body;

      if (!hotelName || selectedIndex == null) {
        return json(res, 400, { error: "Missing hotelName or selectedIndex" });
      }

      const cache = loadCache();
      if (!cache[hotelName]?.results?.[selectedIndex]) {
        return json(res, 404, { error: "Hotel or index not in cache" });
      }

      cache[hotelName].selected = selectedIndex;
      saveCache(cache);

      const selected = cache[hotelName].results[selectedIndex];
      updateOfferInJSON(hotelName, selected);

      return json(res, 200, { ok: true, selected });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  // ── API: tripadvisor rating (with cache) ─────────────────
  if (path === "/api/ta-rating" && req.method === "GET") {
    const name = url.searchParams.get("name");
    const city = url.searchParams.get("city") || "";
    const country = url.searchParams.get("country") || "";

    if (!name) return json(res, 400, { error: "Missing 'name' param" });
    if (!TA_API_KEY) return json(res, 500, { error: "Missing TRIPADVISOR_API_KEY in .env" });

    const cache = loadTaCache();

    if (cache[name]) {
      return json(res, 200, { results: cache[name].results, selected: cache[name].selected ?? null, fromCache: true });
    }

    try {
      const results = await searchTa(name, city, country);
      const selected = results.length === 1 ? 0 : null;
      cache[name] = { results, selected, fetchedAt: new Date().toISOString() };
      saveTaCache(cache);

      if (results.length === 1) updateTaInJSON(name, results[0]);

      return json(res, 200, { results, selected, fromCache: false });
    } catch (err) {
      return json(res, 502, { error: err.message });
    }
  }

  // ── API: select tripadvisor result ────────────────────────
  if (path === "/api/ta-rating/select" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const { hotelName, selectedIndex } = body;

      if (!hotelName || selectedIndex == null) {
        return json(res, 400, { error: "Missing hotelName or selectedIndex" });
      }

      const cache = loadTaCache();
      if (!cache[hotelName]?.results?.[selectedIndex]) {
        return json(res, 404, { error: "Hotel or index not in cache" });
      }

      const candidate = cache[hotelName].results[selectedIndex];

      // Fetch details on-demand if this candidate is still a stub
      if (candidate.rating == null && candidate.taUrl == null) {
        if (!TA_API_KEY) return json(res, 500, { error: "Missing TRIPADVISOR_API_KEY in .env" });
        const details = await fetchTaDetails(candidate.locationId);
        candidate.rating = details.rating;
        candidate.numReviews = details.numReviews;
        candidate.taUrl = details.taUrl;
      }

      cache[hotelName].selected = selectedIndex;
      saveTaCache(cache);
      updateTaInJSON(hotelName, candidate);

      return json(res, 200, { ok: true, selected: candidate });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  // ── API: trivago rating (with cache) ─────────────────────
  if (path === "/api/trivago-rating" && req.method === "GET") {
    const name = url.searchParams.get("name");

    if (!name) return json(res, 400, { error: "Missing 'name' param" });

    const cache = loadTrivagoCache();

    if (cache[name]) {
      return json(res, 200, { results: cache[name].results, selected: cache[name].selected ?? null, fromCache: true });
    }

    try {
      const concept = await searchTrivagoHotel(name);
      if (!concept) {
        cache[name] = { results: [], selected: null, fetchedAt: new Date().toISOString() };
        saveTrivagoCache(cache);
        return json(res, 200, { results: [], selected: null, fromCache: false });
      }

      const ratings = await fetchTrivagoRatingsForNsid(concept.nsid);
      const result = {
        nsid: concept.nsid,
        name: concept.name,
        locationLabel: concept.locationLabel,
        rating: ratings.rating,
        reviewsCount: ratings.reviewsCount,
        trivago_url: ratings.trivago_url,
        aspects: ratings.aspects,
      };

      cache[name] = { results: [result], selected: 0, fetchedAt: new Date().toISOString() };
      saveTrivagoCache(cache);
      updateTrivagoInJSON(name, result);

      return json(res, 200, { results: [result], selected: 0, fromCache: false });
    } catch (err) {
      return json(res, 502, { error: err.message });
    }
  }

  // ── API: select trivago result ────────────────────────────
  if (path === "/api/trivago-rating/select" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const { hotelName, selectedIndex } = body;

      if (!hotelName || selectedIndex == null) {
        return json(res, 400, { error: "Missing hotelName or selectedIndex" });
      }

      const cache = loadTrivagoCache();
      if (!cache[hotelName]?.results?.[selectedIndex]) {
        return json(res, 404, { error: "Hotel or index not in cache" });
      }

      cache[hotelName].selected = selectedIndex;
      saveTrivagoCache(cache);

      const selected = cache[hotelName].results[selectedIndex];
      updateTrivagoInJSON(hotelName, selected);

      return json(res, 200, { ok: true, selected });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  // ── Static files ──────────────────────────────────────────
  let filePath;
  if (path === "/") {
    filePath = join(ROOT, "index.html");
  } else {
    const safe = path.replace(/\.\./g, "");
    filePath = join(ROOT, safe);
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end("404");
    return;
  }

  const ext = extname(filePath);
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  res.end(readFileSync(filePath));
});

/** Update googleRating fields in the offers JSON file for all matching offers */
function updateOfferInJSON(hotelName, result) {
  const file = findLatestOffers();
  if (!file) return;

  const offers = JSON.parse(readFileSync(file, "utf-8"));
  let changed = false;

  for (const o of offers) {
    if (o.name === hotelName) {
      o.googleRating = result.rating;
      o.googleRatingsTotal = result.totalRatings;
      o.googleMapsUrl = result.mapsUrl;
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(file, JSON.stringify(offers, null, 2));
  }
}

server.listen(PORT, () => {
  const keyStatus = GOOGLE_API_KEY ? "loaded" : "MISSING — set GOOGLE_MAPS_API_KEY in .env";
  const taStatus = TA_API_KEY ? "loaded" : "MISSING — set TRIPADVISOR_API_KEY in .env";
  console.log(`SmartWakacje UI    → http://localhost:${PORT}`);
  console.log(`Google API key     → ${keyStatus}`);
  console.log(`TripAdvisor key    → ${taStatus}`);
  console.log(`Trivago            → no API key needed`);
});
