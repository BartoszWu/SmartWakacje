import React from "react";
import { trpc } from "./trpc";
import { useStore } from "./store/useStore";
import { HomePage } from "./components/HomePage";
import { Header } from "./components/Header";
import { Controls } from "./components/Controls";
import { FilterBar } from "./components/FilterBar";
import { OfferGrid } from "./components/OfferGrid";
import { Pagination } from "./components/Pagination";
import { ChatPanel } from "./components/ChatPanel";

function OffersView() {
  const activeSnapshotId = useStore((s) => s.activeSnapshotId);
  const setOffers = useStore((s) => s.setOffers);

  // @ts-expect-error - tRPC type inference issue with monorepo
  const { data: offers, isLoading, error } = trpc.offers.list.useQuery(
    activeSnapshotId ? { snapshotId: activeSnapshotId } : {},
    { enabled: true }
  );

  React.useEffect(() => {
    if (offers) {
      // @ts-expect-error - implicit any from tRPC type issue
      setOffers(offers.map((o, i) => ({ ...o, id: o.id || String(i) })));
    }
  }, [offers, setOffers]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg text-sand flex items-center justify-center font-display text-2xl">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-sand/15 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          Ladowanie ofert...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg text-sand flex items-center justify-center font-display text-2xl">
        <div className="text-center">
          Blad ladowania: {error.message}
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
      <ChatPanel />
    </div>
  );
}

export default function App() {
  const view = useStore((s) => s.view);

  if (view === "home") {
    return <HomePage />;
  }

  return <OffersView />;
}
