import { initTRPC } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";

export const t = initTRPC.context<Context>().create();

export const publicProcedure = t.procedure;
export const router = t.router;

export type Context = {
  apiKey?: string;
};

export const createContext = async (opts: CreateNextContextOptions) => {
  return {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  };
};
