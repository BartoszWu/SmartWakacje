import React, { useState, useCallback } from "react";
import type { Offer } from "@smartwakacje/shared";
import { RatingBar } from "./RatingBar";
import { FavoriteButton } from "./FavoriteButton";
import { formatDate } from "@smartwakacje/shared";
import { useStore, buildOfferDetailPath } from "../store/useStore";

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

const COUNTRY_FLAGS: Record<string, string> = {
  Grecja: "\u{1F1EC}\u{1F1F7}",
  Turcja: "\u{1F1F9}\u{1F1F7}",
  Tunezja: "\u{1F1F9}\u{1F1F3}",
  Egipt: "\u{1F1EA}\u{1F1EC}",
  Hiszpania: "\u{1F1EA}\u{1F1F8}",
  Chorwacja: "\u{1F1ED}\u{1F1F7}",
  "Bu\u0142garia": "\u{1F1E7}\u{1F1EC}",
  Cypr: "\u{1F1E8}\u{1F1FE}",
  Maroko: "\u{1F1F2}\u{1F1E6}",
  Portugalia: "\u{1F1F5}\u{1F1F9}",
  "W\u0142ochy": "\u{1F1EE}\u{1F1F9}",
  "Czarnog\u00F3ra": "\u{1F1F2}\u{1F1EA}",
  Albania: "\u{1F1E6}\u{1F1F1}",
  Malta: "\u{1F1F2}\u{1F1F9}",
};

function MetaChip({ icon, value, label }: { icon: React.ReactNode; value: number | null | undefined; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sand/5 text-xs font-semibold text-sand-dim">
      {icon}
      <span className="text-sand-bright">{value ?? "-"}</span> {label}
    </span>
  );
}

function ScoreChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold ${accent}`}>
      <span className="opacity-70">{label}</span>
      <span>{value}</span>
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
  const openOfferDetail = useStore((s) => s.openOfferDetail);
  const snapshotId = useStore((s) => s.activeSnapshotId);
  const allPhotos = offer.photos?.length ? offer.photos : offer.photo ? [offer.photo] : [];
  const placeholder = `https://placehold.co/570x428/1e1e22/a89b88?text=${encodeURIComponent(offer.name.slice(0, 12))}`;
  const [photoIdx, setPhotoIdx] = useState(0);
  const photoUrl = allPhotos[photoIdx] || placeholder;

  const handleImgError = useCallback(() => {
    setPhotoIdx(prev => {
      const next = prev + 1;
      return next < allPhotos.length ? next : allPhotos.length; // triggers placeholder
    });
  }, [allPhotos.length]);

  const quality = offer.qualityScore;
  const value = offer.valueScore;
  const detailHref = snapshotId ? buildOfferDetailPath(snapshotId, offer.name) : "#";

  return (
    <a
      href={detailHref}
      onClick={(e) => {
        e.preventDefault();
        openOfferDetail(offer);
      }}
      className="block bg-bg-card rounded overflow-hidden border border-sand/5 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-sand/10 opacity-0 translate-y-7 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none no-underline text-inherit"
      style={{
        animation: `cardIn 0.55s cubic-bezier(.22,1,.36,1) ${delay}ms forwards`,
      }}
    >
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-bg-raised group">
        <img
          src={photoUrl}
          alt={offer.name}
          loading="lazy"
          onError={handleImgError}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        <div className="absolute top-3 right-3 z-10">
          <FavoriteButton name={offer.name} hotelId={offer.hotelId} />
        </div>

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
            <span className="px-2.5 py-1 rounded-full bg-black/55 text-white text-[10px] font-bold uppercase tracking-wide backdrop-blur border border-white/10">
              {offer.serviceDesc}
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/55 backdrop-blur border border-white/10 text-[11px] font-bold text-white">
            <span className="text-sm leading-none">{COUNTRY_FLAGS[offer.country] || "\u{1F30D}"}</span>
            {offer.country}
          </span>
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
          <ScoreChip
            label="Q"
            value={quality != null ? quality.toFixed(2) : "—"}
            accent="border-accent/25 bg-accent/10 text-accent"
          />
          <ScoreChip
            label="V"
            value={value != null ? value.toFixed(3) : "—"}
            accent="border-blue/35 bg-blue/10 text-blue"
          />
          <MetaChip
            icon={ICONS.thumb}
            value={offer.ratingRecommends}
            label="poleceń"
          />
          <MetaChip
            icon={ICONS.calendar}
            value={offer.ratingReservationCount}
            label="rezerwacji"
          />
          <MetaChip
            icon={ICONS.briefcase}
            value={offer.employeeRatingCount}
            label="ocen prac."
          />
          <MetaChip icon={ICONS.clock} value={offer.duration} label="dni" />
        </div>

        <div className="flex items-baseline justify-between pt-2 border-t border-sand/5">
          <div>
            <span className="font-display text-2xl text-sand-bright">
              {offer.price.toLocaleString("pl")}
              <small className="font-body text-xs font-medium text-sand-dim ml-1">
                zł
              </small>
            </span>
            {offer.priceOld && (
              <span className="text-xs text-sand-dim line-through ml-2">
                {offer.priceOld.toLocaleString("pl")} zł
              </span>
            )}
            {offer.priceDiscount && (
              <span className="text-[10px] font-bold text-green ml-1">
                -{offer.priceDiscount}%
              </span>
            )}
          </div>
          <span className="text-sm font-semibold text-accent">
            {offer.pricePerPerson.toLocaleString("pl")} zł / os
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-sand-dim">
            {offer.tourOperator}
          </span>
          <span className="text-xs font-semibold text-sand-dim bg-sand/5 px-2 py-0.5 rounded">
            {formatDate(offer.departureDate)} - {formatDate(offer.returnDate)}
          </span>
          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-accent text-white text-xs font-bold uppercase tracking-wide hover:bg-accent-glow hover:scale-[1.04] transition-all"
          >
            Oferta
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-3 h-3"
            >
              <path d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </a>
        </div>
      </div>
    </a>
  );
}
