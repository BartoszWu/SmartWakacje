import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Offer, GoogleCacheEntry, TACacheEntry, TrivagoCacheEntry } from "@smartwakacje/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "..", "..", "data");

export async function findLatestOffers(): Promise<string | null> {
  const dataFile = join(DATA_DIR, "data.json");
  try {
    await readFile(dataFile, "utf-8");
    return dataFile;
  } catch {
    // Continue to check offers_*.json
  }

  const files = await readdir(DATA_DIR);
  const offerFiles = files
    .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
    .map((f) => ({ name: f, path: join(DATA_DIR, f) }));

  if (offerFiles.length === 0) return null;
  return offerFiles[0].path;
}

export async function loadOffers(): Promise<Offer[]> {
  const file = await findLatestOffers();
  if (!file) return [];
  const data = await readFile(file, "utf-8");
  return JSON.parse(data);
}

export async function saveOffers(offers: Offer[]): Promise<void> {
  const file = await findLatestOffers();
  if (!file) throw new Error("No offers file found");
  await writeFile(file, JSON.stringify(offers, null, 2));
}

export async function loadCache<T>(name: string): Promise<Record<string, T>> {
  const file = join(DATA_DIR, `${name}.json`);
  try {
    const data = await readFile(file, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function saveCache<T>(name: string, cache: Record<string, T>): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const file = join(DATA_DIR, `${name}.json`);
  await writeFile(file, JSON.stringify(cache, null, 2));
}

export async function loadGoogleCache(): Promise<Record<string, GoogleCacheEntry>> {
  return loadCache<GoogleCacheEntry>("google-ratings-cache");
}

export async function saveGoogleCache(cache: Record<string, GoogleCacheEntry>): Promise<void> {
  return saveCache("google-ratings-cache", cache);
}

export async function loadTACache(): Promise<Record<string, TACacheEntry>> {
  return loadCache<TACacheEntry>("ta-ratings-cache");
}

export async function saveTACache(cache: Record<string, TACacheEntry>): Promise<void> {
  return saveCache("ta-ratings-cache", cache);
}

export async function loadTrivagoCache(): Promise<Record<string, TrivagoCacheEntry>> {
  return loadCache<TrivagoCacheEntry>("trivago-ratings-cache");
}

export async function saveTrivagoCache(cache: Record<string, TrivagoCacheEntry>): Promise<void> {
  return saveCache("trivago-ratings-cache", cache);
}
