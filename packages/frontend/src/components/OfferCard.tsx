import React from "react";
import type { Offer } from "@smartwakacje/shared";
import { RatingBar } from "./RatingBar";
import { formatDate } from "@smartwakacje/shared";

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5 ml-1 align-middle relative -top-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${i < count ? "fill-gold" : "fill-sand/20"}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
        </svg>
      ))}
    </span>
  );
}

function MetaChip({ icon, value, label }: { icon: React.ReactNode; value: number | null | undefined; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sand/5 text-xs font-semibold text-sand-dim">
      {icon}
      <span className="text-sand-bright">{value ?? "-"}</span> {label}
    </span>
  );
}

const ICONS = {
  thumb: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
};

export function OfferCard({ offer, delay }: { offer: Offer; delay: number }) {
  const photoUrl = offer.photo || `https://placehold.co/570x428/1e1e22/a89b88?text=${encodeURIComponent(offer.name.slice(0, 12))}`;

  return (
    <article
      className="bg-bg-card rounded overflow-hidden border border-sand/5 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-sand/10 opacity-0 translate-y-7"
      style={{ animation: `cardIn 0.55s cubic-bezier(.22,1,.36,1) ${delay}ms forwards` }}
    >
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-bg-raised group">
        <img
          src={photoUrl}
          alt={offer.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/85 via-transparent to-transparent pointer-events-none" />

        <div className="absolute top-3 left-3 flex gap-1.5 z-10">
          {offer.promoFirstMinute && (
            <span className="px-2.5 py-1 rounded-full bg-blue text-white text-[10px] font-bold uppercase tracking-wide">
              First Minute
            </span>
          )}
          {offer.promoLastMinute && (
            <span className="px-2.5 py-1 rounded-full bg-red text-white text-[10px] font-bold uppercase tracking-wide">
              Last Minute
            </span>
          )}
          {offer.serviceDesc && (
            <span className="px-2.5 py-1 rounded-full bg-black/55 text-sand-bright text-[10px] font-bold uppercase tracking-wide backdrop-blur border border-white/10">
              {offer.serviceDesc}
            </span>
          )}
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
      </div>

      <div className="p-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          <MetaChip icon={ICONS.thumb} value={offer.ratingRecommends} label="poleceń" />
          <MetaChip icon={ICONS.calendar} value={offer.ratingReservationCount} label="rezerwacji" />
          <MetaChip icon={ICONS.briefcase} value={offer.employeeRatingCount} label="ocen prac." />
          <MetaChip icon={ICONS.clock} value={offer.duration} label="dni" />
        </div>

        <div className="flex items-baseline justify-between pt-2 border-t border-sand/5">
          <div>
            <span className="font-display text-2xl text-sand-bright">
              {offer.price.toLocaleString("pl")}
              <small className="font-body text-xs font-medium text-sand-dim ml-1">zł</small>
            </span>
            {offer.priceOld && (
              <span className="text-xs text-sand-dim line-through ml-2">
                {offer.priceOld.toLocaleString("pl")} zł
              </span>
            )}
            {offer.priceDiscount && (
              <span className="text-[10px] font-bold text-green ml-1">-{offer.priceDiscount}%</span>
            )}
          </div>
          <span className="text-sm font-semibold text-accent">
            {offer.pricePerPerson.toLocaleString("pl")} zł / os
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-sand-dim">{offer.tourOperator}</span>
          <span className="text-xs font-semibold text-sand-dim bg-sand/5 px-2 py-0.5 rounded">
            {formatDate(offer.departureDate)} - {formatDate(offer.returnDate)}
          </span>
          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-accent text-white text-xs font-bold uppercase tracking-wide hover:bg-accent-glow hover:scale-[1.04] transition-all"
          >
            Zobacz
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
              <path d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}
