import https from "node:https";
import { normalizeName, COUNTRY_EN } from "@smartwakacje/shared";
import type { TASearchResult } from "@smartwakacje/shared";

function get(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: Buffer[] = [];
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchTaDetails(locationId: string): Promise<{
  rating: number | null;
  numReviews: number | null;
  taUrl: string | null;
}> {
  const apiKey = process.env.TRIPADVISOR_API_KEY;
  if (!apiKey) throw new Error("Missing TRIPADVISOR_API_KEY");

  const url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?key=${apiKey}&language=en`;
  const data = (await get(url)) as {
    rating?: string;
    num_reviews?: string;
    web_url?: string;
  };

  return {
    rating: data.rating ? parseFloat(data.rating) : null,
    numReviews: data.num_reviews ? parseInt(data.num_reviews) : null,
    taUrl: data.web_url || null,
  };
}

export async function searchTA(
  name: string,
  city: string,
  country: string
): Promise<TASearchResult[]> {
  const apiKey = process.env.TRIPADVISOR_API_KEY;
  if (!apiKey) throw new Error("Missing TRIPADVISOR_API_KEY");

  const cleanName = normalizeName(name);
  const countryEn = COUNTRY_EN[country] || country || "";
  const query = `${cleanName} ${city || ""} ${countryEn}`.trim();

  const searchUrl = new URL("https://api.content.tripadvisor.com/api/v1/location/search");
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("searchQuery", query);
  searchUrl.searchParams.set("category", "hotels");
  searchUrl.searchParams.set("language", "en");

  const searchData = (await get(searchUrl.toString())) as {
    data?: Array<{
      location_id: string;
      name?: string;
      address_obj?: {
        street1?: string;
        city?: string;
        country?: string;
      };
    }>;
  };

  const candidates = searchData.data?.slice(0, 5) || [];
  if (candidates.length === 0) return [];

  await sleep(500);
  const topDetails = await fetchTaDetails(candidates[0].location_id);

  return candidates.map((loc, i) => {
    const base: TASearchResult = {
      locationId: loc.location_id,
      name: loc.name || "",
      address: [loc.address_obj?.street1, loc.address_obj?.city, loc.address_obj?.country]
        .filter(Boolean)
        .join(", "),
      rating: null,
      numReviews: null,
      taUrl: null,
    };
    if (i === 0) {
      return { ...base, rating: topDetails.rating, numReviews: topDetails.numReviews, taUrl: topDetails.taUrl };
    }
    return base;
  });
}

export async function fetchTADetails(locationId: string): Promise<{
  rating: number | null;
  numReviews: number | null;
  taUrl: string | null;
}> {
  return fetchTaDetails(locationId);
}
