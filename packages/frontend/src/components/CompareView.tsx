import { useState, useCallback } from "react";
import type { Offer } from "@smartwakacje/shared";
import { formatDate } from "@smartwakacje/shared";
import { useStore } from "../store/useStore";
import { trpc } from "../trpc";
import { Stars } from "./Stars";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function MiniPriceChart({ hotelName }: { hotelName: string }) {
  // @ts-expect-error - tRPC type inference issue with monorepo
  const { data: history, isLoading } = trpc.offers.priceHistory.useQuery(
    { hotelName },
    { enabled: !!hotelName }
  );

  if (isLoading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-sand/15 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const points =
    history?.points?.map(
      (p: { date: string; price: number; pricePerPerson: number }) => ({
        date: new Date(p.date).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" }),
        price: p.price,
      })
    ) ?? [];

  if (points.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-sand-dim/50">
        Brak historii cen
      </div>
    );
  }

  const prices = points.map((p: { price: number }) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = (max - min) * 0.2 || 100;

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`cg-${hotelName.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4621a" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#d4621a" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(232,220,200,0.04)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "#a89b88", fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={[Math.floor((min - pad) / 100) * 100, Math.ceil((max + pad) / 100) * 100]}
            tick={{ fill: "#a89b88", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "#222226",
              border: "1px solid rgba(232,220,200,0.1)",
              borderRadius: 4,
              fontSize: 11,
              color: "#e8dcc8",
            }}
            formatter={(v) => [`${Number(v).toLocaleString("pl")} zl`, "Cena"]}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#d4621a"
            strokeWidth={1.5}
            fill={`url(#cg-${hotelName.replace(/\s/g, "")})`}
            dot={false}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RatingCell({ label, value, best, color }: { label: string; value?: number | null; best: boolean; color: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-sand-dim font-bold">{label}</span>
      <span className={`text-sm font-semibold ${best ? "text-green" : color}`}>
        {value != null ? (Number.isInteger(value) ? value : value.toFixed(1)) : "—"}
      </span>
    </div>
  );
}

function CompareColumn({
  offer,
  bestValues,
  onRemove,
}: {
  offer: Offer;
  bestValues: Record<string, string>;
  onRemove: () => void;
}) {
  const allPhotos = offer.photos?.length ? offer.photos : offer.photo ? [offer.photo] : [];
  const placeholder = `https://placehold.co/400x250/1e1e22/a89b88?text=${encodeURIComponent(offer.name.slice(0, 12))}`;
  const [photoIdx, setPhotoIdx] = useState(0);
  const photoUrl = allPhotos[photoIdx] || placeholder;

  const handleImgError = useCallback(() => {
    setPhotoIdx((prev) => {
      const next = prev + 1;
      return next < allPhotos.length ? next : allPhotos.length;
    });
  }, [allPhotos.length]);

  return (
    <div className="bg-bg-card border border-sand/5 rounded-sm overflow-hidden flex flex-col">
      {/* Photo */}
      <div className="relative aspect-[16/10] overflow-hidden bg-bg-raised">
        <img
          src={photoUrl}
          alt={offer.name}
          loading="lazy"
          onError={handleImgError}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent pointer-events-none" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center text-sand-dim hover:text-red transition-colors"
          aria-label="Usun z porownania"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="absolute bottom-2 left-3 right-3 z-10">
          <h3 className="font-display text-lg text-white leading-tight drop-shadow-lg">
            {offer.name}
          </h3>
          <div className="flex items-center gap-1 mt-0.5">
            <Stars count={offer.category} />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Location */}
        <div className="text-xs text-sand-dim">
          {offer.country} / {offer.region} / {offer.city}
        </div>

        {/* Price */}
        <div className="border-t border-sand/5 pt-3">
          <div className="flex items-baseline justify-between">
            <span className={`font-display text-2xl ${bestValues.price === offer.name ? "text-green" : "text-sand-bright"}`}>
              {offer.price.toLocaleString("pl")}
              <small className="font-body text-xs text-sand-dim ml-1">zl</small>
            </span>
          </div>
          <span className={`text-sm font-semibold ${bestValues.pricePerPerson === offer.name ? "text-green" : "text-accent"}`}>
            {offer.pricePerPerson.toLocaleString("pl")} zl / os
          </span>
        </div>

        {/* Ratings */}
        <div className="border-t border-sand/5 pt-3 space-y-0.5">
          <RatingCell label="Wakacje.pl" value={offer.ratingValue} best={bestValues.ratingValue === offer.name} color="text-gold" />
          <RatingCell label="Google" value={offer.googleRating} best={bestValues.googleRating === offer.name} color="text-blue" />
          <RatingCell label="Trivago" value={offer.trivagoRating} best={bestValues.trivagoRating === offer.name} color="text-[#a78bfa]" />
          <RatingCell label="TripAdvisor" value={offer.taRating} best={bestValues.taRating === offer.name} color="text-[#4ade80]" />
          <RatingCell label="Quality" value={offer.qualityScore} best={bestValues.qualityScore === offer.name} color="text-accent" />
          <RatingCell label="Value" value={offer.valueScore} best={bestValues.valueScore === offer.name} color="text-blue" />
        </div>

        {/* Details */}
        <div className="border-t border-sand/5 pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-sand-dim">Serwis</span>
            <span className="text-sand-bright font-medium">{offer.serviceDesc || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sand-dim">Dlugosc</span>
            <span className="text-sand-bright font-medium">{offer.duration} dni</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sand-dim">Termin</span>
            <span className="text-sand-bright font-medium">
              {formatDate(offer.departureDate)} - {formatDate(offer.returnDate)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sand-dim">Organizator</span>
            <span className="text-sand-bright font-medium">{offer.tourOperator}</span>
          </div>
        </div>

        {/* Price chart */}
        <div className="border-t border-sand/5 pt-3">
          <div className="text-[10px] uppercase tracking-wider text-sand-dim font-bold mb-2">Historia cen</div>
          <MiniPriceChart hotelName={offer.name} />
        </div>

        {/* Link */}
        <a
          href={offer.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-accent text-white text-xs font-bold uppercase tracking-wide hover:bg-accent-glow hover:scale-[1.03] transition-all no-underline"
        >
          Zobacz oferte
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
            <path d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </a>
      </div>
    </div>
  );
}

export function CompareView() {
  const offers = useStore((s) => s.offers);
  const compareList = useStore((s) => s.compareList);
  const removeFromCompare = useStore((s) => s.removeFromCompare);
  const openFavorites = useStore((s) => s.openFavorites);

  const compareOffers = compareList
    .map((name) => offers.find((o) => o.name === name))
    .filter((o): o is Offer => o != null);

  // Calculate best values
  const bestValues: Record<string, string> = {};
  const metrics: Array<{ key: keyof Offer; lower?: boolean }> = [
    { key: "price", lower: true },
    { key: "pricePerPerson", lower: true },
    { key: "ratingValue" },
    { key: "googleRating" },
    { key: "trivagoRating" },
    { key: "taRating" },
    { key: "qualityScore" },
    { key: "valueScore" },
  ];

  for (const { key, lower } of metrics) {
    let best: Offer | null = null;
    let bestVal = lower ? Infinity : -Infinity;
    for (const o of compareOffers) {
      const v = o[key] as number | undefined;
      if (v == null) continue;
      if (lower ? v < bestVal : v > bestVal) {
        bestVal = v;
        best = o;
      }
    }
    if (best) bestValues[key] = best.name;
  }

  if (compareOffers.length === 0) {
    return (
      <div className="min-h-screen bg-bg text-sand font-body flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-2xl text-sand-dim mb-4">Brak hoteli do porownania</h2>
          <button
            type="button"
            onClick={openFavorites}
            className="px-5 py-2.5 rounded-full bg-sand/8 text-sand-dim text-xs font-bold uppercase tracking-wide border border-sand/10 hover:bg-sand/15 transition-all"
          >
            Wróc do ulubionych
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-sand font-body relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-bg via-bg/80 to-transparent backdrop-blur-xl pt-5 pb-3 px-8">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={openFavorites}
              className="text-sand-dim hover:text-accent transition-colors text-sm font-medium bg-transparent border-0 cursor-pointer"
            >
              &larr; Ulubione
            </button>
            <h1 className="font-display text-3xl text-sand-bright tracking-tight">
              Porownanie
              <span className="text-accent ml-2 text-xl">{compareOffers.length}</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="max-w-[1600px] mx-auto px-8 pb-16">
        <div className={`grid gap-5 ${
          compareOffers.length <= 2
            ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto"
            : compareOffers.length === 3
            ? "grid-cols-1 md:grid-cols-3"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        }`}>
          {compareOffers.map((offer) => (
            <CompareColumn
              key={offer.name}
              offer={offer}
              bestValues={bestValues}
              onRemove={() => removeFromCompare(offer.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
