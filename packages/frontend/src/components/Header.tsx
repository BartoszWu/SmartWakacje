import { useStore } from "../store/useStore";

export function Header() {
  const offers = useStore((s) => s.offers);
  const filteredOffers = useStore((s) => s.filteredOffers);
  const goHome = useStore((s) => s.goHome);
  const meta = useStore((s) => s.activeSnapshotMeta);

  const src = filteredOffers.length ? filteredOffers : offers;
  const n = src.length;
  const avgPrice = n ? Math.round(src.reduce((s, o) => s + o.pricePerPerson, 0) / n) : 0;
  const avgRating = n ? (src.reduce((s, o) => s + (o.ratingValue || 0), 0) / n).toFixed(1) : "0";
  const minPrice = n ? Math.min(...src.map((o) => o.pricePerPerson)) : 0;

  const snapshotLabel = meta
    ? `${new Date(meta.createdAt).toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })} · ${meta.countries?.join(", ") || ""}`
    : null;

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-bg via-bg/80 to-transparent backdrop-blur-xl pt-5 pb-3 px-8">
      <div className="max-w-7xl mx-auto flex items-baseline justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-4">
          <button
            type="button"
            onClick={goHome}
            className="text-sand-dim hover:text-accent transition-colors text-sm font-medium mr-1"
          >
            &larr; Wyszukiwania
          </button>
          <h1 className="font-display text-3xl text-sand-bright tracking-tight">
            Smart<span className="text-accent">Wakacje</span>
          </h1>
          {snapshotLabel && (
            <span className="text-sand-dim text-xs hidden md:inline">
              {snapshotLabel}
            </span>
          )}
        </div>
        <div className="flex gap-6 text-xs font-semibold uppercase tracking-wider text-sand-dim">
          <div>
            Oferty<span className="text-sand-bright font-bold ml-1">{n}</span>
          </div>
          <div>
            Sr. cena/os<span className="text-sand-bright font-bold ml-1">{avgPrice.toLocaleString("pl")} zl</span>
          </div>
          <div>
            Sr. ocena<span className="text-sand-bright font-bold ml-1">{avgRating}</span>
          </div>
          <div>
            Min cena/os<span className="text-sand-bright font-bold ml-1">{minPrice.toLocaleString("pl")} zl</span>
          </div>
        </div>
      </div>
    </header>
  );
}
