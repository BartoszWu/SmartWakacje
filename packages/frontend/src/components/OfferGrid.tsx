import { useStore } from "../store/useStore";
import { OfferCard } from "./OfferCard";
import type { Offer } from "@smartwakacje/shared";

export function OfferGrid() {
  const filteredOffers = useStore((s) => s.filteredOffers);
  const offers = useStore((s) => s.offers);
  const page = useStore((s) => s.page);
  const perPage = useStore((s) => s.perPage);

  if (filteredOffers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-24 text-center font-display text-2xl text-sand-dim">
        {offers.length === 0 ? "Brak ofert — uruchom bun run scrape" : "Brak ofert pasujących do filtrów"}
      </div>
    );
  }

  const start = (page - 1) * perPage;
  const pageOffers = filteredOffers.slice(start, start + perPage);

  const uniqueOffers: Offer[] = [];
  const seen = new Set<string>();
  for (const o of pageOffers) {
    if (!seen.has(o.name)) {
      seen.add(o.name);
      uniqueOffers.push(o);
    }
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-8 py-1 text-xs font-semibold text-sand-dim">
        {pageOffers.length > 0 && (
          <span>
            <span className="text-sand-bright">{start + 1}-{Math.min(start + perPage, filteredOffers.length)}</span> z{" "}
            <span className="text-sand-bright">{filteredOffers.length}</span> ofert
          </span>
        )}
      </div>
      <main className="max-w-7xl mx-auto px-8 pb-16 grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-5">
        {uniqueOffers.map((offer, i) => (
          <OfferCard key={offer.id} offer={offer} delay={Math.min(i * 40, 600)} />
        ))}
      </main>
    </>
  );
}
