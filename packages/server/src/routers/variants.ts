import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { fetchAllVariants, enrichVariantsWithFlightTimes } from "../services/wakacje-description";

const offerVariantSchema = z.object({
  id: z.string(),
  serviceDesc: z.string(),
  duration: z.number(),
  numberOfNights: z.number(),
  totalPrice: z.number(),
  departureCity: z.string(),
  departureDate: z.string(),
  returnDate: z.string(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  returnDepartTime: z.string().optional(),
  returnArrivalTime: z.string().optional(),
  roomDesc: z.string().optional(),
});

// Run promises with limited concurrency
async function pMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export const variantsRouter = router({
  fetchBatchVariants: publicProcedure
    .input(
      z.object({
        offers: z.array(z.object({
          offerId: z.string(),
          hotelId: z.number().optional(),
          tourOp: z.string().optional(),
          tourId: z.number().optional(),
        })),
        adults: z.number().optional(),
        kidsAges: z.array(z.string()).optional(),
        month: z.number().min(1).max(12).optional(),
        departurePlace: z.array(z.number()).optional(),
        maxEnrichGroups: z.number().min(10).max(200).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const adults = input.adults ?? 2;
      const kidsAges = input.kidsAges ?? [];
      const results: Record<string, import("@smartwakacje/shared").OfferVariant[]> = {};

      // Step 1: fetch base variants (concurrency 5)
      await pMap(
        input.offers,
        async ({ offerId }) => {
          try {
            results[offerId] = await fetchAllVariants(offerId, {
              adults,
              kidsAges,
              month: input.month,
              departurePlace: input.departurePlace,
            });
          } catch {
            results[offerId] = [];
          }
        },
        5
      );

      // Step 2: enrich with flight times (concurrency 3)
      const enrichable = input.offers.filter(
        (o) => o.hotelId && o.tourOp && o.tourId && results[o.offerId].length > 0
      );
      await pMap(
        enrichable,
        async ({ offerId, hotelId, tourOp, tourId }) => {
          try {
            results[offerId] = await enrichVariantsWithFlightTimes(
              offerId,
              results[offerId],
              { hotelId: hotelId!, tourOp: tourOp!, tourId: tourId! },
              { adults, kidsAges },
              input.maxEnrichGroups ?? 40
            );
          } catch {
            // keep unenriched variants
          }
        },
        3
      );

      return results;
    }),

  fetchVariants: publicProcedure
    .input(
      z.object({
        offerId: z.string(),
        adults: z.number().optional(),
        kidsAges: z.array(z.string()).optional(),
        month: z.number().min(1).max(12).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return fetchAllVariants(input.offerId, {
        adults: input.adults ?? 2,
        kidsAges: input.kidsAges ?? [],
        month: input.month,
      });
    }),

  enrichVariants: publicProcedure
    .input(
      z.object({
        offerId: z.string(),
        variants: z.array(offerVariantSchema),
        hotelId: z.number(),
        tourOp: z.string(),
        tourId: z.number(),
        adults: z.number().optional(),
        kidsAges: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return enrichVariantsWithFlightTimes(
        input.offerId,
        input.variants,
        { hotelId: input.hotelId, tourOp: input.tourOp, tourId: input.tourId },
        { adults: input.adults ?? 2, kidsAges: input.kidsAges ?? [] }
      );
    }),
});
