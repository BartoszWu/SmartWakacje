import React from "react";
import { trpc } from "./trpc";
import { useStore } from "./store/useStore";
import { Header } from "./components/Header";
import { Controls } from "./components/Controls";
import { FilterBar } from "./components/FilterBar";
import { OfferGrid } from "./components/OfferGrid";
import { Pagination } from "./components/Pagination";

export default function App() {
  // @ts-expect-error - tRPC type inference issue with monorepo
  const { data: offers, isLoading, error } = trpc.offers.list.useQuery();
  const setOffers = useStore((s) => s.setOffers);

  console.log("App render", { offers: offers?.length, isLoading, error });

  React.useEffect(() => {
    if (offers) {
      console.log("Setting offers", offers.length);
      // @ts-expect-error - implicit any from tRPC type issue
      setOffers(offers.map((o, i) => ({ ...o, id: o.id || String(i) })));
    }
  }, [offers, setOffers]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg text-sand flex items-center justify-center font-display text-2xl">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-sand/15 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          Ładowanie ofert...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg text-sand flex items-center justify-center font-display text-2xl">
        <div className="text-center">
          Błąd ładowania: {error.message}
          <br />
          <small className="text-sand-dim text-base">Uruchom najpierw: bun run scrape</small>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-sand font-body relative">
      <Header />
      <Controls />
      <FilterBar />
      <OfferGrid />
      <Pagination />
    </div>
  );
}
