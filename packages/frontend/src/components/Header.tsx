import { useStore } from "../store/useStore";

export function Header() {
  const offers = useStore((s) => s.offers);
  const filteredOffers = useStore((s) => s.filteredOffers);

  const src = filteredOffers.length ? filteredOffers : offers;
  const n = src.length;
  const avgPrice = n ? Math.round(src.reduce((s, o) => s + o.pricePerPerson, 0) / n) : 0;
  const avgRating = n ? (src.reduce((s, o) => s + (o.ratingValue || 0), 0) / n).toFixed(1) : "0";
  const minPrice = n ? Math.min(...src.map((o) => o.pricePerPerson)) : 0;

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-bg via-bg/80 to-transparent backdrop-blur-xl pt-5 pb-3 px-8">
      <div className="max-w-7xl mx-auto flex items-baseline justify-between flex-wrap gap-4">
        <h1 className="font-display text-3xl text-sand-bright tracking-tight">
          Smart<span className="text-accent">Wakacje</span>
        </h1>
        <div className="flex gap-6 text-xs font-semibold uppercase tracking-wider text-sand-dim">
          <div>
            Oferty<span className="text-sand-bright font-bold ml-1">{n}</span>
          </div>
          <div>
            Śr. cena/os<span className="text-sand-bright font-bold ml-1">{avgPrice.toLocaleString("pl")} zł</span>
          </div>
          <div>
            Śr. ocena<span className="text-sand-bright font-bold ml-1">{avgRating}</span>
          </div>
          <div>
            Min cena/os<span className="text-sand-bright font-bold ml-1">{minPrice.toLocaleString("pl")} zł</span>
          </div>
        </div>
      </div>
    </header>
  );
}
