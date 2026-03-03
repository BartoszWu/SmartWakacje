import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { listSnapshots, saveSnapshot, deleteSnapshot } from "../services/cache";
import { scrapeOffers } from "../../../../scripts/src/scraper-core";
import { enrichOffers } from "../services/enrich";
import type { SnapshotMeta } from "@smartwakacje/shared";
import {
  startScrapeProgress,
  updateStep,
  completeStep,
  finishScrapeProgress,
  getScrapeProgress,
} from "../scrape-progress";

const scraperConfigSchema = z.object({
  departureDateFrom: z.string(),
  departureDateTo: z.string(),
  airports: z.array(z.number()),
  countries: z.array(z.number()),
  service: z.number(),
  adults: z.number(),
  children: z.number(),
  childAges: z.array(z.string()),
  attributes: z.array(z.number()).default([]),
  pageSize: z.number().default(50),
  delayBetweenPages: z.number().default(1000),
});

export const snapshotsRouter = router({
  list: publicProcedure.query(async () => {
    return listSnapshots();
  }),

  scrapeProgress: publicProcedure.query(() => {
    return getScrapeProgress();
  }),

  scrape: publicProcedure
    .input(scraperConfigSchema)
    .mutation(async ({ input }) => {
      const config = input;
      startScrapeProgress();

      const ENRICH_LABEL: Record<string, string> = {
        "Google Maps": "Pobieranie ocen z Google Maps",
        "Trivago": "Pobieranie ocen z Trivago",
        "TripAdvisor": "Pobieranie ocen z TripAdvisor",
      };

      try {
        const result = await scrapeOffers(config, (_page, _totalPages, fetched, total) => {
          updateStep("Pobieranie ofert z Wakacje.pl", fetched, total);
        });
        completeStep("Pobieranie ofert z Wakacje.pl");

        console.log(`Scraped ${result.parsed.length} offers, enriching ratings...`);
        await enrichOffers(result.parsed, (phase, done, total) => {
          console.log(`  [${phase}] ${done}/${total}`);
          updateStep(ENRICH_LABEL[phase] ?? phase, done, total);
        });
        completeStep("Pobieranie ocen z Google Maps");
        completeStep("Pobieranie ocen z Trivago");
        completeStep("Pobieranie ocen z TripAdvisor");
        console.log("Enrichment complete");

        updateStep("Zapisywanie wyników", 0, 1);
        const now = new Date();
        const snapshotId = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

        const countries = [...new Set(result.parsed.map((o) => o.country))].sort();
        const meta: SnapshotMeta = {
          id: snapshotId,
          createdAt: now.toISOString(),
          offerCount: result.parsed.length,
          filters: config,
          countries,
        };

        const rawData = {
          totalCount: result.totalCount,
          fetchedCount: result.raw.length,
          offers: result.raw,
          fetchedAt: now.toISOString(),
        };

        await saveSnapshot(snapshotId, result.parsed, rawData, meta);
        completeStep("Zapisywanie wyników");

        return meta;
      } finally {
        finishScrapeProgress();
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await deleteSnapshot(input.id);
      return { ok: true };
    }),
});
