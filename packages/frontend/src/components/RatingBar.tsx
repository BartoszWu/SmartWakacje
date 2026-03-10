import { useState } from "react";
import { trpc } from "../trpc";
import { useStore } from "../store/useStore";
import type { Offer } from "@smartwakacje/shared";
import { abbreviateCount } from "@smartwakacje/shared";

export type RatingBarVariant = "overlay" | "standalone";

export function RatingBar({
  offer,
  variant = "overlay",
}: {
  offer: Offer;
  variant?: RatingBarVariant;
}) {
  const isOverlay = variant === "overlay";
  return (
    <div
      className={`flex text-xs font-bold ${
        isOverlay
          ? "absolute bottom-0 left-0 right-0 z-20 bg-black/70 backdrop-blur border-t border-white/5"
          : "bg-bg-card border-sand/8"
      }`}
    >
      <GoogleSegment offer={offer} variant={variant} />
      <TrivagoSegment offer={offer} variant={variant} />
      <TASegment offer={offer} variant={variant} />
      <WakacjeSegment offer={offer} variant={variant} />
    </div>
  );
}

function GoogleSegment({ offer, variant }: { offer: Offer; variant: RatingBarVariant }) {
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
          googlePlaceId: r.placeId,
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
        color="var(--color-google)"
        label="G"
        value={offer.googleRating!.toFixed(1)}
        count={abbreviateCount(offer.googleRatingsTotal)}
        onClick={() => setIsOpen(!isOpen)}
        variant={variant}
      />
    );
  }

  if (notFound) {
    return <NotFoundSegment label="G" variant={variant} />;
  }

  return (
    <SegmentButton
      color="var(--color-google)"
      label="G"
      value="?"
      onClick={handleFetch}
      loading={isLoading}
      variant={variant}
    />
  );
}

function TrivagoSegment({ offer, variant }: { offer: Offer; variant: RatingBarVariant }) {
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
        color="var(--color-trivago)"
        label="tv"
        value={offer.trivagoRating!.toFixed(1)}
        count={abbreviateCount(offer.trivagoReviewsCount)}
        variant={variant}
      />
    );
  }

  if (notFound) {
    return <NotFoundSegment label="tv" variant={variant} />;
  }

  return (
    <SegmentButton color="var(--color-trivago)" label="tv" value="?" onClick={handleFetch} loading={isLoading} variant={variant} />
  );
}

function TASegment({ offer, variant }: { offer: Offer; variant: RatingBarVariant }) {
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
        color="var(--color-ta)"
        label="TA"
        value={offer.taRating!.toFixed(1)}
        count={abbreviateCount(offer.taReviewCount)}
        variant={variant}
      />
    );
  }

  if (notFound) {
    return <NotFoundSegment label="TA" variant={variant} />;
  }

  return (
    <SegmentButton color="var(--color-ta)" label="TA" value="?" onClick={handleFetch} loading={isLoading} variant={variant} />
  );
}

function WakacjeSegment({ offer, variant }: { offer: Offer; variant: RatingBarVariant }) {
  if (!offer.ratingValue) {
    return <NotFoundSegment label="W" variant={variant} lastSegment />;
  }

  return (
    <SegmentButton
      color="var(--color-gold)"
      label="W"
      value={offer.ratingValue.toFixed(1)}
      count={abbreviateCount(offer.ratingReservationCount)}
      variant={variant}
    />
  );
}

function NotFoundSegment({
  label,
  variant,
  lastSegment,
}: {
  label: string;
  variant: RatingBarVariant;
  lastSegment?: boolean;
}) {
  const isOverlay = variant === "overlay";
  return (
    <span
      className={`flex-1 flex items-center justify-center gap-1 py-2 cursor-default ${
        isOverlay
          ? `text-white/30 ${lastSegment ? "" : "border-r border-white/5"}`
          : `text-sand-dim/40 ${lastSegment ? "" : "border-r border-sand/8"}`
      }`}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-65">{label}</span>
      <span>–</span>
    </span>
  );
}

function SegmentButton({
  color,
  label,
  value,
  count,
  onClick,
  loading,
  variant,
}: {
  color: string;
  label: string;
  value: string;
  count?: string;
  onClick?: () => void;
  loading?: boolean;
  variant: RatingBarVariant;
}) {
  const isOverlay = variant === "overlay";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick || loading}
      className={`flex-1 flex items-center justify-center gap-1 py-2 transition-all last:border-r-0 ${
        isOverlay
          ? `text-white/70 border-r border-white/5 ${
              loading ? "animate-pulse cursor-default" : onClick ? "hover:bg-white/5 hover:text-white/90" : "cursor-default"
            }`
          : `text-sand-dim border-r border-sand/8 ${
              loading ? "animate-pulse cursor-default" : onClick ? "hover:bg-sand/6 hover:text-sand-bright" : "cursor-default"
            }`
      }`}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-65">{label}</span>
      <span style={{ color }}>{value}</span>
      {count && <span className="text-[10px] font-medium opacity-55">{count}</span>}
    </button>
  );
}
