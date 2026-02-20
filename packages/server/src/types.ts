import type { offersRouter } from "./routers/offers";

export type AppRouter = {
  offers: typeof offersRouter;
};
