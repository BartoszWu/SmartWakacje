import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { listSnapshots, saveSnapshot, deleteSnapshot, loadOffers, saveOffers } from "../services/cache";
import { scrapeOffers } from "../../../../scripts/src/scraper-core";
import { enrichOffers } from "../services/enrich";
import type { EnrichFailure } from "../services/enrich";
import type { SnapshotMeta } from "@smartwakacje/shared";
import {
  startScrapeProgress,
  updateStep,
  completeStep,
  warnStep,
  setScrapePhase,
  setSnapshotId,
  finishScrapeProgress,
  getScrapeProgress,
  initCountries,
  updateCountryProgress,
} from "../scrape-progress";
import { COUNTRY_IDS } from "@smartwakacje/shared";

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
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
});

const ENRICH_LABEL: Record<string, string> = {
  "Google Maps": "Pobieranie ocen z Google Maps",
  "Trivago": "Pobieranie ocen z Trivago",
  "TripAdvisor": "Pobieranie ocen z TripAdvisor",
};

function applyFailuresToProgress(failures: { phase: string; hotels: EnrichFailure[] }[]): boolean {
  let hasWarnings = false;
  for (const f of failures) {
    const label = ENRICH_LABEL[f.phase] ?? f.phase;
    warnStep(label, f.hotels);
    hasWarnings = true;
  }
  return hasWarnings;
}

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

      try {
        // Initialize per-country progress for the scrape step
        const SCRAPE_LABEL = "Pobieranie ofert z Wakacje.pl";
        const countryNameMap: Record<number, string> = Object.fromEntries(
          Object.entries(COUNTRY_IDS).map(([name, id]) => [id, name]),
        );
        const countryNames = config.countries.map((id) => countryNameMap[id] ?? `ID ${id}`);
        initCountries(SCRAPE_LABEL, countryNames);

        const result = await scrapeOffers(config, (_page, _totalPages, fetched, total, countryName) => {
          if (countryName) {
            updateCountryProgress(SCRAPE_LABEL, countryName, fetched, total);
          } else {
            updateStep(SCRAPE_LABEL, fetched, total);
          }
        });
        completeStep(SCRAPE_LABEL);

        console.log(`Scraped ${result.parsed.length} offers, enriching ratings...`);
        const enrichResult = await enrichOffers(result.parsed, (phase, done, total) => {
          updateStep(ENRICH_LABEL[phase] ?? phase, done, total);
        });

        // Complete steps that had no failures
        for (const label of Object.values(ENRICH_LABEL)) {
          const step = getScrapeProgress().steps.find((s) => s.label === label);
          if (step && step.status !== "warning") {
            completeStep(label);
          }
        }
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

        await saveSnapshot(snapshotId, enrichResult.offers, rawData, meta);
        completeStep("Zapisywanie wyników");
        setSnapshotId(snapshotId);

        // Decide: show summary with warnings or finish clean
        const hasWarnings = applyFailuresToProgress(enrichResult.failures);
        if (hasWarnings) {
          setScrapePhase("summary");
        } else {
          finishScrapeProgress();
        }

        return meta;
      } catch (err) {
        finishScrapeProgress();
        throw err;
      }
    }),

  retryEnrichment: publicProcedure
    .input(z.object({
      snapshotId: z.string(),
      phases: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const { snapshotId, phases } = input;

      // Collect hotel names from current progress failures for requested phases
      const progress = getScrapeProgress();
      const hotelNames = new Set<string>();
      for (const step of progress.steps) {
        const phaseKey = Object.entries(ENRICH_LABEL).find(([, v]) => v === step.label)?.[0];
        if (phaseKey && phases.includes(phaseKey) && step.failures.length > 0) {
          for (const f of step.failures) {
            hotelNames.add(f.name);
          }
        }
      }

      if (hotelNames.size === 0) {
        return { retriedCount: 0 };
      }

      // Reset relevant steps to active
      setScrapePhase("running");
      for (const step of progress.steps) {
        const phaseKey = Object.entries(ENRICH_LABEL).find(([, v]) => v === step.label)?.[0];
        if (phaseKey && phases.includes(phaseKey)) {
          step.status = "active";
          step.failed = 0;
          step.failures = [];
        }
      }

      // Load offers, re-enrich only failed hotels
      const offers = await loadOffers(snapshotId);
      const enrichResult = await enrichOffers(
        offers,
        (phase, done, total) => {
          updateStep(ENRICH_LABEL[phase] ?? phase, done, total);
        },
        hotelNames,
      );

      // Save updated offers back (merge — enrichOffers already applied ratings)
      await saveOffers(enrichResult.offers, snapshotId);

      // Complete steps without new failures, warn steps with failures
      for (const label of Object.values(ENRICH_LABEL)) {
        const step = progress.steps.find((s) => s.label === label);
        if (step && step.status !== "warning") {
          completeStep(label);
        }
      }
      const hasWarnings = applyFailuresToProgress(enrichResult.failures);
      if (hasWarnings) {
        setScrapePhase("summary");
      } else {
        // All resolved — keep snapshotId so UI can navigate
        setScrapePhase("summary");
        // Clear failures on all steps
        for (const step of progress.steps) {
          if (step.status === "warning") {
            step.status = "done";
            step.failed = 0;
            step.failures = [];
          }
        }
      }

      return { retriedCount: hotelNames.size };
    }),

  dismissProgress: publicProcedure
    .mutation(async () => {
      const progress = getScrapeProgress();
      const snapshotId = progress.snapshotId;
      finishScrapeProgress();
      return { snapshotId };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await deleteSnapshot(input.id);
      return { ok: true };
    }),
});
