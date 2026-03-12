import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { loadDescriptionCache, saveDescriptionCache, loadOffers } from "../services/cache";
import { fetchHotelDescription } from "../services/wakacje-description";

export const descriptionsRouter = router({
  getDescription: publicProcedure
    .input(z.object({ hotelName: z.string() }))
    .query(async ({ input }) => {
      const cache = await loadDescriptionCache();
      return cache[input.hotelName] ?? null;
    }),

  fetchDescription: publicProcedure
    .input(
      z.object({
        offerId: z.string(),
        hotelName: z.string(),
        snapshotId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check cache first
      const cache = await loadDescriptionCache();
      if (cache[input.hotelName]) return cache[input.hotelName];

      // Find offer in current snapshot
      const offers = await loadOffers(input.snapshotId || null);
      const offer = offers.find((o) => o.name === input.hotelName || o.id === input.offerId);
      if (!offer) throw new Error("Offer not found");

      // Default participants (we don't have snapshot meta here, use sensible defaults)
      const config = { adults: 2, kids: 0, kidsAges: [] as string[] };

      const entry = await fetchHotelDescription(offer, config);
      cache[input.hotelName] = entry;
      await saveDescriptionCache(cache);

      return entry;
    }),
});
