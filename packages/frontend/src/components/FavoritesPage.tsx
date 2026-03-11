import { useState, useCallback } from "react";
import type { Offer } from "@smartwakacje/shared";
import { useStore } from "../store/useStore";
import { FavoriteButton } from "./FavoriteButton";
import { RatingBar } from "./RatingBar";
import { Stars } from "./Stars";
import { formatDate } from "@smartwakacje/shared";

function FavoriteCard({
  offer,
  delay,
  checked,
  onToggleCompare,
}: {
  offer: Offer;
  delay: number;
  checked: boolean;
  onToggleCompare: (name: string) => void;
}) {
  const openOfferDetail = useStore((s) => s.openOfferDetail);
  const allPhotos = offer.photos?.length ? offer.photos : offer.photo ? [offer.photo] : [];
  const placeholder = `https://placehold.co/570x428/1e1e22/a89b88?text=${encodeURIComponent(offer.name.slice(0, 12))}`;
  const [photoIdx, setPhotoIdx] = useState(0);
  const photoUrl = allPhotos[photoIdx] || placeholder;

  const handleImgError = useCallback(() => {
    setPhotoIdx((prev) => {
      const next = prev + 1;
      return next < allPhotos.length ? next : allPhotos.length;
    });
  }, [allPhotos.length]);

  return (
    <div
      className="bg-bg-card rounded overflow-hidden border border-sand/5 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-sand/10 opacity-0 translate-y-7"
      style={{
        animation: `cardIn 0.55s cubic-bezier(.22,1,.36,1) ${delay}ms forwards`,
      }}
    >
      {/* Image + star */}
      <button
        type="button"
        onClick={() => openOfferDetail(offer)}
        className="relative w-full aspect-[16/10] overflow-hidden bg-bg-raised group block text-left cursor-pointer border-0 p-0"
      >
        <img
          src={photoUrl}
          alt={offer.name}
          loading="lazy"
          onError={handleImgError}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/85 via-transparent to-transparent pointer-events-none" />

        <div className="absolute top-3 right-3 z-10">
          <FavoriteButton name={offer.name} hotelId={offer.hotelId} />
        </div>

        <RatingBar offer={offer} />

        <div className="absolute bottom-2.5 left-3 right-3 z-10">
          <h3 className="font-display text-xl text-white leading-tight drop-shadow-lg">
            {offer.name} <Stars count={offer.category} />
          </h3>
          <div className="text-xs text-white/65 mt-0.5 font-medium">
            {offer.country} / {offer.region} / {offer.city}
          </div>
        </div>
      </button>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between pt-1 border-t border-sand/5">
          <div>
            <span className="font-display text-2xl text-sand-bright">
              {offer.price.toLocaleString("pl")}
              <small className="font-body text-xs font-medium text-sand-dim ml-1">zl</small>
            </span>
          </div>
          <span className="text-sm font-semibold text-accent">
            {offer.pricePerPerson.toLocaleString("pl")} zl / os
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-sand-dim">
            {offer.tourOperator} · {offer.duration} dni
          </span>
          <span className="text-xs font-semibold text-sand-dim bg-sand/5 px-2 py-0.5 rounded">
            {formatDate(offer.departureDate)} - {formatDate(offer.returnDate)}
          </span>
        </div>

        {/* Compare checkbox */}
        <label
          className="flex items-center gap-2 pt-2 border-t border-sand/5 cursor-pointer group/check"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              checked
                ? "bg-accent border-accent"
                : "border-sand/20 group-hover/check:border-sand/40"
            }`}
            onClick={(e) => {
              e.preventDefault();
              onToggleCompare(offer.name);
            }}
          >
            {checked && (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3.5 h-3.5">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span
            className="text-xs text-sand-dim font-medium"
            onClick={(e) => {
              e.preventDefault();
              onToggleCompare(offer.name);
            }}
          >
            Porownaj
          </span>
        </label>
      </div>
    </div>
  );
}

export function FavoritesPage() {
  const offers = useStore((s) => s.offers);
  const favorites = useStore((s) => s.favorites);
  const compareList = useStore((s) => s.compareList);
  const addToCompare = useStore((s) => s.addToCompare);
  const removeFromCompare = useStore((s) => s.removeFromCompare);
  const openCompare = useStore((s) => s.openCompare);
  const goBackToOffers = useStore((s) => s.goBackToOffers);
  const goHome = useStore((s) => s.goHome);
  const activeSnapshotId = useStore((s) => s.activeSnapshotId);

  const favoriteOffers = (() => {
    const cheapest = new Map<string, Offer>();
    for (const o of offers) {
      if (!favorites.has(o.name)) continue;
      const existing = cheapest.get(o.name);
      if (!existing || o.price < existing.price) {
        cheapest.set(o.name, o);
      }
    }
    return [...cheapest.values()];
  })();

  const handleToggleCompare = (name: string) => {
    if (compareList.includes(name)) {
      removeFromCompare(name);
    } else {
      addToCompare(name);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-sand font-body relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-bg via-bg/80 to-transparent backdrop-blur-xl pt-5 pb-3 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={activeSnapshotId ? goBackToOffers : goHome}
              className="text-sand-dim hover:text-accent transition-colors text-sm font-medium no-underline bg-transparent border-0 cursor-pointer"
            >
              &larr; {activeSnapshotId ? "Oferty" : "Wyszukiwania"}
            </button>
            <h1 className="font-display text-3xl text-sand-bright tracking-tight">
              Ulubione
              <span className="text-accent ml-2 text-xl">{favoriteOffers.length}</span>
            </h1>
          </div>

          {compareList.length >= 2 && (
            <button
              type="button"
              onClick={openCompare}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-white text-xs font-bold uppercase tracking-wide hover:bg-accent-glow hover:scale-[1.03] transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V5M9 21H5a2 2 0 01-2-2V5" />
              </svg>
              Porownaj ({compareList.length})
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 pb-16">
        {favoriteOffers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              className="w-16 h-16 text-sand-dim/30 mb-6"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
            </svg>
            <h2 className="font-display text-2xl text-sand-dim mb-2">Brak ulubionych</h2>
            <p className="text-sm text-sand-dim/60 max-w-sm">
              Zaznacz gwiazdke na karcie hotelu, aby dodac go do ulubionych.
              {!activeSnapshotId && " Najpierw otwórz snapshot z ofertami."}
            </p>
            <button
              type="button"
              onClick={activeSnapshotId ? goBackToOffers : goHome}
              className="mt-6 px-5 py-2.5 rounded-full bg-sand/8 text-sand-dim text-xs font-bold uppercase tracking-wide border border-sand/10 hover:bg-sand/15 hover:text-sand-bright transition-all"
            >
              {activeSnapshotId ? "Przegladaj oferty" : "Wróc do wyszukiwan"}
            </button>
          </div>
        ) : (
          <>
            {compareList.length > 0 && compareList.length < 2 && (
              <div className="mb-4 px-4 py-2.5 rounded bg-accent/8 border border-accent/15 text-xs text-accent font-medium">
                Zaznacz minimum 2 hotele do porownania ({compareList.length}/4)
              </div>
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-5">
              {favoriteOffers.map((offer, i) => (
                <FavoriteCard
                  key={offer.name}
                  offer={offer}
                  delay={i * 50}
                  checked={compareList.includes(offer.name)}
                  onToggleCompare={handleToggleCompare}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
