#!/usr/bin/env bun

import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scraperConfig } from "../../config";
import type { Offer } from "@smartwakacje/shared";
import { scrapeOffers } from "./scraper-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");
const SNAPSHOTS_DIR = join(DATA_DIR, "snapshots");

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  console.log(`Scraping: ${scraperConfig.departureDateFrom} -> ${scraperConfig.departureDateTo}\n`);

  const result = await scrapeOffers(scraperConfig, (page, totalPages, fetched, total) => {
    process.stdout.write(`  ${page}/${totalPages} (${fetched}/${total})\n`);
  });

  const now = new Date();
  const snapshotId = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const snapshotDir = join(SNAPSHOTS_DIR, snapshotId);
  await mkdir(snapshotDir, { recursive: true });

  // Save raw
  await writeFile(
    join(snapshotDir, "raw.json"),
    JSON.stringify(
      { totalCount: result.totalCount, fetchedCount: result.raw.length, offers: result.raw, fetchedAt: now.toISOString() },
      null,
      2
    )
  );

  // Save parsed offers
  await writeFile(join(snapshotDir, "offers.json"), JSON.stringify(result.parsed, null, 2));

  // Save CSV
  const CSV_COLUMNS: (keyof Offer)[] = [
    "name", "placeName", "url", "country", "region", "city",
    "duration", "departureDate", "returnDate",
    "ratingValue", "ratingRecommends", "ratingReservationCount",
    "price", "pricePerPerson", "priceOld", "priceDiscount",
    "category", "serviceDesc", "tourOperator",
    "promoLastMinute", "promoFirstMinute", "employeeRatingCount", "photo",
  ];
  const csvRows = [
    CSV_COLUMNS.join(","),
    ...result.parsed.map((o) => CSV_COLUMNS.map((col) => escapeCsv(o[col])).join(",")),
  ];
  await writeFile(join(snapshotDir, "offers.csv"), "\uFEFF" + csvRows.join("\n"), "utf8");

  // Save meta
  const countries = [...new Set(result.parsed.map((o) => o.country))].sort();
  const meta = {
    id: snapshotId,
    createdAt: now.toISOString(),
    offerCount: result.parsed.length,
    filters: scraperConfig,
    countries,
  };
  await writeFile(join(snapshotDir, "meta.json"), JSON.stringify(meta, null, 2));

  const prices = result.parsed.map((o) => o.price).filter(Boolean);
  console.log(`\nSaved ${result.parsed.length} offers to ${snapshotDir}`);
  console.log(`  Snapshot: ${snapshotId}`);
  console.log(
    `  Price: ${Math.min(...prices)} - ${Math.max(...prices)} PLN (avg ${Math.round(
      prices.reduce((a, b) => a + b, 0) / prices.length
    )})`
  );
}

main().catch(console.error);
