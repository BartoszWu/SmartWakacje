import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Offer, GoogleCacheEntry, TACacheEntry, TrivagoCacheEntry, SnapshotMeta } from "@smartwakacje/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "..", "..", "data");
const SNAPSHOTS_DIR = join(DATA_DIR, "snapshots");
const CACHE_DIR = join(DATA_DIR, "cache");

// ── Snapshots ──────────────────────────────────────────────────

export async function listSnapshots(): Promise<SnapshotMeta[]> {
  try {
    const entries = await readdir(SNAPSHOTS_DIR, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    const metas: SnapshotMeta[] = [];
    for (const dir of dirs) {
      try {
        const metaPath = join(SNAPSHOTS_DIR, dir, "meta.json");
        const raw = await readFile(metaPath, "utf-8");
        metas.push(JSON.parse(raw));
      } catch {
        // Skip dirs without valid meta.json
      }
    }

    return metas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function getLatestSnapshotId(): Promise<string | null> {
  const snapshots = await listSnapshots();
  return snapshots.length > 0 ? snapshots[0].id : null;
}

function snapshotDir(snapshotId: string): string {
  return join(SNAPSHOTS_DIR, snapshotId);
}

// ── Offers (snapshot-aware) ────────────────────────────────────

export async function loadOffers(snapshotId?: string | null): Promise<Offer[]> {
  // If no snapshotId, try latest snapshot
  const id = snapshotId || (await getLatestSnapshotId());
  if (!id) {
    // Fallback: try legacy data.json or offers_*.json in root
    return loadLegacyOffers();
  }

  const offersFile = join(snapshotDir(id), "offers.json");
  try {
    const data = await readFile(offersFile, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveOffers(offers: Offer[], snapshotId?: string | null): Promise<void> {
  const id = snapshotId || (await getLatestSnapshotId());
  if (!id) throw new Error("No snapshot found to save offers to");

  const offersFile = join(snapshotDir(id), "offers.json");
  await writeFile(offersFile, JSON.stringify(offers, null, 2));
}

async function loadLegacyOffers(): Promise<Offer[]> {
  // Try data.json first (enriched), then offers_*.json
  const dataFile = join(DATA_DIR, "data.json");
  try {
    const data = await readFile(dataFile, "utf-8");
    return JSON.parse(data);
  } catch {
    // Continue
  }

  try {
    const files = await readdir(DATA_DIR);
    const offerFiles = files
      .filter((f) => f.startsWith("offers_") && f.endsWith(".json"))
      .sort()
      .reverse();
    if (offerFiles.length > 0) {
      const data = await readFile(join(DATA_DIR, offerFiles[0]), "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // Continue
  }

  return [];
}

// ── Snapshot CRUD ──────────────────────────────────────────────

export async function saveSnapshot(
  snapshotId: string,
  offers: Offer[],
  raw: unknown,
  meta: SnapshotMeta
): Promise<void> {
  const dir = snapshotDir(snapshotId);
  await mkdir(dir, { recursive: true });
  await Promise.all([
    writeFile(join(dir, "offers.json"), JSON.stringify(offers, null, 2)),
    writeFile(join(dir, "raw.json"), JSON.stringify(raw, null, 2)),
    writeFile(join(dir, "meta.json"), JSON.stringify(meta, null, 2)),
  ]);
}

export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const dir = snapshotDir(snapshotId);
  const { rm } = await import("node:fs/promises");
  await rm(dir, { recursive: true, force: true });
}

// ── Rating caches (global, in data/cache/) ─────────────────────

export async function loadCache<T>(name: string): Promise<Record<string, T>> {
  const file = join(CACHE_DIR, `${name}.json`);
  try {
    const data = await readFile(file, "utf-8");
    return JSON.parse(data);
  } catch {
    // Fallback: try legacy location in data/ root
    const legacyFile = join(DATA_DIR, `${name}.json`);
    try {
      const data = await readFile(legacyFile, "utf-8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
}

export async function saveCache<T>(name: string, cache: Record<string, T>): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const file = join(CACHE_DIR, `${name}.json`);
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

// ── Exports for snapshot dir path ──────────────────────────────

export { DATA_DIR, SNAPSHOTS_DIR, CACHE_DIR };
