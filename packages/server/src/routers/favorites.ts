import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { loadFavorites, saveFavorites } from "../services/cache";

export const favoritesRouter = router({
  list: publicProcedure.query(async () => {
    return loadFavorites();
  }),

  toggle: publicProcedure
    .input(z.object({ name: z.string(), hotelId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const favorites = await loadFavorites();
      const exists = input.name in favorites;

      if (exists) {
        delete favorites[input.name];
      } else {
        favorites[input.name] = {
          addedAt: new Date().toISOString(),
          hotelId: input.hotelId,
        };
      }

      await saveFavorites(favorites);
      return { favorited: !exists };
    }),
});
