import { useState } from "react";
import { trpc } from "../trpc";
import { useStore } from "../store/useStore";
import type { Offer } from "@smartwakacje/shared";
import { abbreviateCount } from "@smartwakacje/shared";

export function RatingBar({ offer }: { offer: Offer }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex bg-black/70 backdrop-blur border-t border-sand/5 text-xs font-bold">
      <GoogleSegment offer={offer} />
      <TrivagoSegment offer={offer} />
      <TASegment offer={offer} />
      <WakacjeSegment offer={offer} />
    </div>
  );
}

function GoogleSegment({ offer }: { offer: Offer }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const updateOffer = useStore((s) => s.updateOffer);
  // @ts-expect-error - tRPC type inference issue with monorepo
  const utils = trpc.useUtils();

  const hasRating = offer.googleRating && offer.googleRating > 0;
  const notFound = offer.googleRating === 0;

  const handleFetch = async () => {
    if (hasRating || notFound || isLoading) return;
    setIsLoading(true);
    try {
      const data = await utils.offers.fetchGoogleRating.fetch({
        name: offer.name,
        city: offer.city,
        country: offer.country,
      });
      if (data.results?.length && data.selected != null) {
        const r = data.results[data.selected];
        updateOffer(offer.name, {
          googleRating: r.rating,
          googleRatingsTotal: r.totalRatings,
          googleMapsUrl: r.mapsUrl,
        });
      } else if (!data.results?.length) {
        updateOffer(offer.name, { googleRating: 0, googleRatingsTotal: 0 });
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  };

  if (hasRating) {
    return (
      <SegmentButton
        color="#6aabf7"
        label="G"
        value={offer.googleRating!.toFixed(1)}
        count={abbreviateCount(offer.googleRatingsTotal)}
        onClick={() => setIsOpen(!isOpen)}
      />
    );
  }

  if (notFound) {
    return (
      <span className="flex-1 flex items-center justify-center gap-1 py-2 text-sand-dim opacity-30 cursor-default border-r border-sand/5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-65">G</span>
        <span>–</span>
      </span>
    );
  }

  return (
    <SegmentButton
      color="#6aabf7"
      label="G"
      value="?"
      onClick={handleFetch}
      loading={isLoading}
    />
  );
}

function TrivagoSegment({ offer }: { offer: Offer }) {
  const [isLoading, setIsLoading] = useState(false);
  const updateOffer = useStore((s) => s.updateOffer);
  const markNotFound = useStore((s) => s.markTrivagoNotFound);
  const trivagoNotFound = useStore((s) => s.trivagoNotFound);
  // @ts-expect-error - tRPC type inference issue with monorepo
  const utils = trpc.useUtils();

  const hasRating = offer.trivagoRating != null;
  const notFound = trivagoNotFound.has(offer.name);

  const handleFetch = async () => {
    if (hasRating || notFound || isLoading) return;
    setIsLoading(true);
    try {
      const data = await utils.offers.fetchTrivagoRating.fetch({ name: offer.name });
      if (data.results?.length && data.selected != null) {
        const r = data.results[data.selected];
        updateOffer(offer.name, {
          trivagoRating: r.rating ?? undefined,
          trivagoReviewsCount: r.reviewsCount ?? undefined,
          trivagoUrl: r.trivagoUrl,
          trivagoAspects: r.aspects ?? undefined,
        });
      } else if (!data.results?.length) {
        markNotFound(offer.name);
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  };

  if (hasRating) {
    return (
      <SegmentButton
        color="#a78bfa"
        label="tv"
        value={offer.trivagoRating!.toFixed(1)}
        count={abbreviateCount(offer.trivagoReviewsCount)}
      />
    );
  }

  if (notFound) {
    return (
      <span className="flex-1 flex items-center justify-center gap-1 py-2 text-sand-dim opacity-30 cursor-default border-r border-sand/5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-65">tv</span>
        <span>–</span>
      </span>
    );
  }

  return (
    <SegmentButton color="#a78bfa" label="tv" value="?" onClick={handleFetch} loading={isLoading} />
  );
}

function TASegment({ offer }: { offer: Offer }) {
  const [isLoading, setIsLoading] = useState(false);
  const updateOffer = useStore((s) => s.updateOffer);
  // @ts-expect-error - tRPC type inference issue with monorepo
  const utils = trpc.useUtils();

  const hasRating = offer.taRating != null;
  const notFound = offer.taRating === 0;

  const handleFetch = async () => {
    if (hasRating || notFound || isLoading) return;
    setIsLoading(true);
    try {
      const data = await utils.offers.fetchTARating.fetch({
        name: offer.name,
        city: offer.city,
        country: offer.country,
      });
      if (data.results?.length && data.selected != null) {
        const r = data.results[data.selected];
        updateOffer(offer.name, {
          taRating: r.rating ?? undefined,
          taReviewCount: r.numReviews ?? undefined,
          taUrl: r.taUrl ?? undefined,
        });
      } else if (!data.results?.length) {
        updateOffer(offer.name, { taRating: 0, taReviewCount: 0 });
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  };

  if (hasRating) {
    return (
      <SegmentButton
        color="#4ade80"
        label="TA"
        value={offer.taRating!.toFixed(1)}
        count={abbreviateCount(offer.taReviewCount)}
      />
    );
  }

  if (notFound) {
    return (
      <span className="flex-1 flex items-center justify-center gap-1 py-2 text-sand-dim opacity-30 cursor-default border-r border-sand/5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-65">TA</span>
        <span>–</span>
      </span>
    );
  }

  return (
    <SegmentButton color="#4ade80" label="TA" value="?" onClick={handleFetch} loading={isLoading} />
  );
}

function WakacjeSegment({ offer }: { offer: Offer }) {
  if (!offer.ratingValue) {
    return (
      <span className="flex-1 flex items-center justify-center gap-1 py-2 text-sand-dim opacity-30 cursor-default">
        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-65">W</span>
        <span>–</span>
      </span>
    );
  }

  return (
    <SegmentButton
      color="#d4a843"
      label="W"
      value={offer.ratingValue.toFixed(1)}
      count={abbreviateCount(offer.ratingReservationCount)}
    />
  );
}

function SegmentButton({
  color,
  label,
  value,
  count,
  onClick,
  loading,
}: {
  color: string;
  label: string;
  value: string;
  count?: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick || loading}
      className={`flex-1 flex items-center justify-center gap-1 py-2 text-sand-dim transition-all border-r border-sand/5 last:border-r-0 ${
        loading ? "animate-pulse cursor-default" : onClick ? "hover:bg-white/5 hover:text-sand-bright" : "cursor-default"
      }`}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-65">{label}</span>
      <span style={{ color }}>{value}</span>
      {count && <span className="text-[10px] font-medium opacity-55">{count}</span>}
    </button>
  );
}
