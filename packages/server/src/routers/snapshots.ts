import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { listSnapshots, saveSnapshot, deleteSnapshot } from "../services/cache";
import { scrapeOffers } from "../../../../scripts/src/scraper-core";
import type { SnapshotMeta } from "@smartwakacje/shared";

const scraperConfigSchema = z.object({
  departureDateFrom: z.string(),
  departureDateTo: z.string(),
  airports: z.array(z.number()),
  countries: z.array(z.number()),
  service: z.number(),
  adults: z.number(),
  children: z.number(),
  childAges: z.array(z.string()),
  pageSize: z.number().default(50),
  delayBetweenPages: z.number().default(1000),
});

export const snapshotsRouter = router({
  list: publicProcedure.query(async () => {
    return listSnapshots();
  }),

  scrape: publicProcedure
    .input(scraperConfigSchema)
    .mutation(async ({ input }) => {
      const config = input;

      const result = await scrapeOffers(config);

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

      return meta;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await deleteSnapshot(input.id);
      return { ok: true };
    }),
});
