import { useState, useEffect, useCallback, useMemo } from "react";
import { useStore } from "../store/useStore";
import { trpc } from "../trpc";
import { formatDate } from "@smartwakacje/shared";

/** Read current CSS variable values for Recharts (which needs raw color strings). */
function useChartTheme() {
  const theme = useStore((s) => s.theme);
  return useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    const v = (name: string) => s.getPropertyValue(name).trim();
    /** RGB-channel vars need wrapping in rgb() */
    const c = (name: string) => `rgb(${v(name)})`;
    return {
      bg: c("--color-bg"),
      accent: c("--color-accent"),
      accentGlow: c("--color-accent-glow"),
      sandDim: c("--color-sand-dim"),
      chartGrid: v("--color-chart-grid"),
      chartAxisLine: v("--color-chart-axis-line"),
      chartCursor: v("--color-chart-cursor"),
      chartRefLine: v("--color-chart-ref-line"),
      gradientTop: v("--color-gradient-area-top"),
      gradientMid: v("--color-gradient-area-mid"),
      gradientBot: v("--color-gradient-area-bot"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { RatingBar } from "./RatingBar";
import { FavoriteButton } from "./FavoriteButton";

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

function formatFullDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5 align-middle">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < count ? "fill-gold" : "fill-sand/15"}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
        </svg>
      ))}
    </span>
  );
}

function PriceChangeIndicator({
  change,
  changePercent,
}: {
  change: number | null;
  changePercent: number | null;
}) {
  if (change == null || changePercent == null) return null;

  const isDown = change < 0;
  const isZero = change === 0;

  if (isZero) {
    return (
      <span className="text-sand-dim text-sm font-semibold">
        Bez zmian
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-bold ${
        isDown ? "text-green" : "text-red"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className={`w-4 h-4 ${isDown ? "" : "rotate-180"}`}
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      {isDown ? "" : "+"}
      {change.toLocaleString("pl")} zl ({changePercent > 0 ? "+" : ""}
      {changePercent.toFixed(1)}%)
    </span>
  );
}

interface ChartPoint {
  date: string;
  dateLabel: string;
  fullDate: string;
  price: number;
  pricePerPerson: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-bg-card/95 backdrop-blur-lg border border-sand/10 rounded-sm px-4 py-3 shadow-lg">
      <div className="text-[10px] uppercase tracking-widest text-sand-dim font-bold mb-2">
        {data.fullDate}
      </div>
      <div className="flex items-baseline gap-3">
        <div>
          <span className="font-display text-xl text-sand-bright">
            {data.price.toLocaleString("pl")}
          </span>
          <span className="text-xs text-sand-dim ml-1">zl</span>
        </div>
        <div className="text-xs text-accent font-semibold">
          {data.pricePerPerson.toLocaleString("pl")} zl/os
        </div>
      </div>
    </div>
  );
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: ChartPoint;
  bgColor?: string;
  accentColor?: string;
}) {
  const { cx, cy, bgColor = "rgb(var(--color-bg))", accentColor = "rgb(var(--color-accent))" } = props;
  if (cx == null || cy == null) return null;

  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={bgColor} stroke={accentColor} strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={2.5} fill={accentColor} />
    </g>
  );
}

function PriceChart({
  points,
  minPrice,
  maxPrice,
}: {
  points: ChartPoint[];
  minPrice: number;
  maxPrice: number;
}) {
  const ct = useChartTheme();

  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 text-sand-dim font-body text-sm">
        <div className="text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-10 h-10 mx-auto mb-3 opacity-30"
          >
            <path d="M3 3v18h18" />
            <path d="M7 16l4-4 4 4 5-5" />
          </svg>
          Hotel pojawil sie tylko w 1 wyszukiwaniu.
          <br />
          <span className="text-sand-dim/60">
            Historia cen bedzie dostepna po kolejnym wyszukiwaniu.
          </span>
        </div>
      </div>
    );
  }

  const padding = (maxPrice - minPrice) * 0.15 || 100;
  const yMin = Math.floor((minPrice - padding) / 100) * 100;
  const yMax = Math.ceil((maxPrice + padding) / 100) * 100;
  const avgPrice = Math.round(points.reduce((s, p) => s + p.price, 0) / points.length);

  return (
    <div
      className="opacity-0"
      style={{
        animation: "chartReveal 0.8s cubic-bezier(.22,1,.36,1) 0.3s forwards",
      }}
    >
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart
          data={points}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ct.gradientTop} stopOpacity={1} />
              <stop offset="50%" stopColor={ct.gradientMid} stopOpacity={1} />
              <stop offset="100%" stopColor={ct.gradientBot} stopOpacity={1} />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={ct.accent} stopOpacity={0.6} />
              <stop offset="50%" stopColor={ct.accentGlow} stopOpacity={1} />
              <stop offset="100%" stopColor={ct.accent} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 6"
            stroke={ct.chartGrid}
            vertical={false}
          />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: ct.sandDim, fontSize: 11, fontFamily: "Libre Franklin" }}
            axisLine={{ stroke: ct.chartAxisLine }}
            tickLine={false}
            dy={8}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: ct.sandDim, fontSize: 11, fontFamily: "Libre Franklin" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
            width={48}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: ct.chartCursor,
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />
          <ReferenceLine
            y={avgPrice}
            stroke={ct.chartRefLine}
            strokeDasharray="8 4"
            label={{
              value: `sr. ${avgPrice.toLocaleString("pl")}`,
              position: "right",
              fill: ct.sandDim,
              fontSize: 10,
              fontFamily: "Libre Franklin",
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="url(#lineGradient)"
            strokeWidth={2.5}
            fill="url(#priceGradient)"
            dot={<CustomDot bgColor={ct.bg} accentColor={ct.accent} />}
            activeDot={{
              r: 7,
              fill: ct.accentGlow,
              stroke: ct.bg,
              strokeWidth: 3,
            }}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  delay: number;
}) {
  return (
    <div
      className="bg-bg-card border border-sand/5 rounded-sm p-4 opacity-0"
      style={{
        animation: `statSlide 0.5s cubic-bezier(.22,1,.36,1) ${delay}ms forwards`,
      }}
    >
      <div className="text-[10px] uppercase tracking-widest text-sand-dim font-bold mb-1.5">
        {label}
      </div>
      <div className={`font-display text-2xl ${accent || "text-sand-bright"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-sand-dim mt-0.5">{sub}</div>}
    </div>
  );
}

/* ── Lightbox ──────────────────────────────────────── */
function Lightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);

  const prev = useCallback(() => setIdx((i) => (i > 0 ? i - 1 : photos.length - 1)), [photos.length]);
  const next = useCallback(() => setIdx((i) => (i < photos.length - 1 ? i + 1 : 0)), [photos.length]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onClose, prev, next]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ animation: "lightboxBgIn 0.25s ease-out forwards" }}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/88 backdrop-blur-md"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === "Enter") onClose(); }}
        role="button"
        tabIndex={-1}
        aria-label="Zamknij"
      />

      {/* close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full bg-sand/10 backdrop-blur border border-sand/10 flex items-center justify-center text-sand-dim hover:text-sand-bright hover:bg-sand/20 transition-all"
        aria-label="Zamknij"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <title>Zamknij</title>
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* counter */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 text-xs text-sand-dim font-bold uppercase tracking-widest">
        {idx + 1} / {photos.length}
      </div>

      {/* nav arrows */}
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-4 z-10 w-11 h-11 rounded-full bg-sand/8 backdrop-blur border border-sand/8 flex items-center justify-center text-sand-dim hover:text-sand-bright hover:bg-sand/18 transition-all"
            aria-label="Poprzednie zdjecie"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <title>Poprzednie</title>
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-4 z-10 w-11 h-11 rounded-full bg-sand/8 backdrop-blur border border-sand/8 flex items-center justify-center text-sand-dim hover:text-sand-bright hover:bg-sand/18 transition-all"
            aria-label="Nastepne zdjecie"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <title>Nastepne</title>
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* image */}
      <img
        key={idx}
        src={photos[idx]}
        alt={`Zdjecie ${idx + 1}`}
        className="relative z-[1] max-h-[85vh] max-w-[90vw] object-contain rounded-sm"
        style={{ animation: "lightboxIn 0.3s cubic-bezier(.22,1,.36,1) forwards" }}
      />
    </div>
  );
}

/* ── Photo Gallery (compact: 4-6 visible + "+N" overlay) ── */
function GalleryThumb({
  url,
  index,
  onClick,
  overlay,
}: {
  url: string;
  index: number;
  onClick: () => void;
  overlay?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-sm overflow-hidden border border-sand/5 hover:border-sand/20 transition-all group focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none opacity-0 aspect-[4/3] h-full w-full"
      style={{ animation: `galleryThumbIn 0.4s cubic-bezier(.22,1,.36,1) ${200 + index * 50}ms forwards` }}
    >
      <img
        src={url}
        alt={`Zdjecie ${index + 1}`}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-[1.06]"
      />
      {overlay ? (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <span className="font-display text-2xl text-white">+{overlay}</span>
        </div>
      ) : (
        <>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-white drop-shadow-lg">
              <title>Powieksz</title>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
            </svg>
          </div>
        </>
      )}
    </button>
  );
}

/** Shows all photos as a grid gallery. First photo is larger (featured). */
function PhotoGallery({ photos }: { photos: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const MAX_VISIBLE = 8;
  const visible = photos.slice(0, MAX_VISIBLE);
  const overflow = photos.length - MAX_VISIBLE;

  return (
    <>
      <section
        className="opacity-0"
        style={{ animation: "heroReveal 0.5s cubic-bezier(.22,1,.36,1) 0.3s forwards" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-sand-bright">Galeria</h2>
          <span className="text-xs text-sand-dim font-medium">{photos.length} zdjec</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Featured: first photo spans 2 cols + 2 rows */}
          <div className="col-span-2 row-span-2">
            <GalleryThumb
              url={photos[0]}
              index={0}
              onClick={() => setLightboxIdx(0)}
            />
          </div>
          {visible.slice(1).map((url, i) => {
            const isLast = i === visible.length - 2 && overflow > 0;
            return (
              <GalleryThumb
                key={url}
                url={url}
                index={i + 1}
                onClick={() => setLightboxIdx(isLast ? i + 1 : i + 1)}
                overlay={isLast ? overflow : undefined}
              />
            );
          })}
        </div>
      </section>

      {lightboxIdx != null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  );
}

const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

function GoogleMapEmbed({
  placeId,
  hotelName,
  city,
  country,
  tall,
}: {
  placeId?: string;
  hotelName: string;
  city: string;
  country: string;
  tall?: boolean;
}) {
  if (!GMAPS_API_KEY) return null;

  const q = placeId
    ? `place_id:${placeId}`
    : `${hotelName}, ${city}, ${country}`;

  const src = `https://www.google.com/maps/embed/v1/place?key=${GMAPS_API_KEY}&q=${encodeURIComponent(q)}&zoom=14`;

  return (
    <div
      className="opacity-0"
      style={{
        animation: "heroReveal 0.5s cubic-bezier(.22,1,.36,1) 0.35s forwards",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl text-sand-bright">Lokalizacja</h2>
        {placeId && (
          <a
            href={`https://www.google.com/maps/place/?q=place_id:${placeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sand-dim hover:text-accent transition-colors font-medium inline-flex items-center gap-1"
          >
            Google Maps
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
              <path d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </a>
        )}
      </div>
      <div className={`bg-bg-card border border-sand/5 rounded-sm overflow-hidden ${tall ? "h-[450px]" : "h-[350px]"}`}>
        <iframe
          title="Lokalizacja hotelu"
          src={src}
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}

function HotelDescription({ hotelName, offerId }: { hotelName: string; offerId: string }) {
  const snapshotId = useStore((s) => s.activeSnapshotId);

  // @ts-expect-error - tRPC type inference issue with monorepo
  const { data: description, isLoading, refetch } = trpc.descriptions.getDescription.useQuery(
    { hotelName },
    { enabled: !!hotelName }
  );

  // @ts-expect-error - tRPC type inference issue with monorepo
  const fetchMutation = trpc.descriptions.fetchDescription.useMutation({
    onSuccess: () => refetch(),
  });

  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-sand/15 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!description) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-sand-dim mb-3">Brak opisu hotelu w cache</p>
        <button
          type="button"
          onClick={() => fetchMutation.mutate({ offerId, hotelName, snapshotId })}
          disabled={fetchMutation.isPending}
          className="px-4 py-2 rounded-sm text-xs font-semibold bg-accent text-white hover:bg-accent-glow transition-colors disabled:opacity-40"
        >
          {fetchMutation.isPending ? "Pobieranie..." : "Pobierz opis"}
        </button>
        {fetchMutation.isError && (
          <p className="mt-2 text-xs text-red">{(fetchMutation.error as Error).message}</p>
        )}
      </div>
    );
  }

  const sections = description.descriptions ?? [];

  return (
    <div className="space-y-1">
      {sections.map((section: { label: string; value: string }, idx: number) => {
        const isExpanded = expandedSections.has(idx);
        return (
          <div key={section.label} className="border border-sand/5 rounded-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(idx)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-sand/3 transition-colors"
            >
              <span className="text-xs uppercase tracking-wider text-sand-dim font-bold">
                {section.label}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`w-4 h-4 text-sand-dim transition-transform ${isExpanded ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {isExpanded && (
              <div
                className="px-4 pb-4 text-sm text-sand leading-relaxed prose-sm [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-1 [&_p]:mb-2"
                dangerouslySetInnerHTML={{ __html: section.value }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function OfferDetailPage() {
  const offer = useStore((s) => s.activeOffer);

  // @ts-expect-error - tRPC type inference issue with monorepo
  const { data: history, isLoading } = trpc.offers.priceHistory.useQuery(
    { hotelName: offer?.name ?? "" },
    { enabled: !!offer?.name }
  );

  if (!offer) return null;

  const chartPoints: ChartPoint[] =
    history?.points?.map(
      (p: { date: string; price: number; pricePerPerson: number }) => ({
        date: p.date,
        dateLabel: formatShortDate(p.date),
        fullDate: formatFullDate(p.date),
        price: p.price,
        pricePerPerson: p.pricePerPerson,
      })
    ) ?? [];

  const allPhotos = offer.photos?.length ? offer.photos : offer.photo ? [offer.photo] : [];

  const heroPhoto =
    allPhotos[0] ||
    `https://placehold.co/1200x500/1e1e22/a89b88?text=${encodeURIComponent(
      offer.name.slice(0, 12)
    )}`;

  return (
    <div className="min-h-screen bg-bg text-sand font-body relative">
      {/* ── Hero: contained image ──────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 md:px-8 pt-6">
        <div className="relative h-[380px] md:h-[420px] overflow-hidden rounded-sm">
          <img
            src={heroPhoto}
            alt={offer.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* gradient overlay — heavier at bottom for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Hero content overlay */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-6 md:px-8 pb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              {/* Left: name, stars, badges, location */}
              <div
                className="opacity-0 min-w-0 flex-1"
                style={{
                  animation:
                    "heroReveal 0.6s cubic-bezier(.22,1,.36,1) 0.1s forwards",
                }}
              >
                <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                  <Stars count={offer.category} />
                  {offer.serviceDesc && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[10px] font-bold uppercase tracking-wide border border-white/10 backdrop-blur-sm">
                      {offer.serviceDesc}
                    </span>
                  )}
                  {offer.promoLastMinute && (
                    <span className="px-2.5 py-0.5 rounded-full bg-red/30 text-red text-[10px] font-bold uppercase tracking-wide border border-red/30 backdrop-blur-sm">
                      Last Minute
                    </span>
                  )}
                  {offer.promoFirstMinute && (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue/30 text-blue text-[10px] font-bold uppercase tracking-wide border border-blue/30 backdrop-blur-sm">
                      First Minute
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-3xl md:text-4xl text-white leading-tight tracking-tight drop-shadow-lg">
                    {offer.name}
                  </h1>
                  <FavoriteButton name={offer.name} hotelId={offer.hotelId} offer={offer} size="lg" />
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-sm text-white/70">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="w-4 h-4 shrink-0"
                  >
                    <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <circle cx="12" cy="11" r="3" />
                  </svg>
                  {offer.country} / {offer.region} / {offer.city}
                </div>
              </div>

              {/* Right: price block */}
              <div
                className="opacity-0 shrink-0 text-right md:text-right"
                style={{
                  animation:
                    "heroReveal 0.6s cubic-bezier(.22,1,.36,1) 0.2s forwards",
                }}
              >
                <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">
                  Aktualna cena
                </div>
                <div className="font-display text-4xl md:text-5xl text-white drop-shadow-lg leading-none">
                  {offer.price.toLocaleString("pl")}
                  <span className="text-lg text-white/50 ml-1">zl</span>
                </div>
                <div className="mt-1 flex items-center gap-3 justify-end">
                  <span className="text-base font-semibold text-accent-glow">
                    {offer.pricePerPerson.toLocaleString("pl")} zl
                    <span className="text-xs text-white/50 ml-1">/ os</span>
                  </span>
                  {history && (
                    <PriceChangeIndicator
                      change={history.priceChange}
                      changePercent={history.priceChangePercent}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info bar: rating + CTA ───────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div
          className="relative mt-4 mb-8 rounded-sm overflow-hidden border border-sand/8 opacity-0 flex items-center"
          style={{
            animation:
              "heroReveal 0.5s cubic-bezier(.22,1,.36,1) 0.3s forwards",
          }}
        >
          <div className="flex-1 min-w-0">
            <RatingBar offer={offer} variant="standalone" />
          </div>
          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 mr-3 rounded-full bg-accent text-white text-xs font-bold uppercase tracking-wide hover:bg-accent-glow hover:scale-[1.03] transition-all"
          >
            Zobacz oferte
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-3.5 h-3.5"
            >
              <path d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </a>
        </div>
      </div>

      {/* ── Two-column body ──────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 md:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left column: gallery + chart + stats ──────── */}
          <div className="lg:col-span-3 space-y-8">
            {/* Photo gallery (compact thumbnails) */}
            {allPhotos.length > 0 && <PhotoGallery photos={allPhotos} />}

            {/* Hotel description */}
            <section
              className="opacity-0"
              style={{ animation: "heroReveal 0.5s cubic-bezier(.22,1,.36,1) 0.35s forwards" }}
            >
              <h2 className="font-display text-xl text-sand-bright mb-3">Opis hotelu</h2>
              <div className="bg-bg-card border border-sand/5 rounded-sm p-4">
                <HotelDescription hotelName={offer.name} offerId={offer.id} />
              </div>
            </section>

            {/* Chart section */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-xl text-sand-bright">
                  Historia cen
                </h2>
                {chartPoints.length > 1 && (
                  <span className="text-xs text-sand-dim">
                    {chartPoints.length} wyszukiwan
                  </span>
                )}
              </div>
              <div className="bg-bg-card border border-sand/5 rounded-sm p-4 md:p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="w-6 h-6 border-2 border-sand/15 border-t-accent rounded-full animate-spin" />
                  </div>
                ) : (
                  <PriceChart
                    points={chartPoints}
                    minPrice={history?.minPrice ?? offer.price}
                    maxPrice={history?.maxPrice ?? offer.price}
                  />
                )}
              </div>
            </section>

            {/* Stats grid */}
            {history && history.points?.length > 1 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Minimum"
                  value={`${history.minPrice.toLocaleString("pl")} zl`}
                  sub={`${history.minPricePerPerson.toLocaleString("pl")} zl/os`}
                  accent="text-green"
                  delay={500}
                />
                <StatCard
                  label="Maximum"
                  value={`${history.maxPrice.toLocaleString("pl")} zl`}
                  sub={`${history.maxPricePerPerson.toLocaleString("pl")} zl/os`}
                  accent="text-red"
                  delay={560}
                />
                <StatCard
                  label="Srednia"
                  value={`${Math.round(
                    history.points.reduce(
                      (s: number, p: { price: number }) => s + p.price,
                      0
                    ) / history.points.length
                  ).toLocaleString("pl")} zl`}
                  delay={620}
                />
                <StatCard
                  label="Obserwacji"
                  value={String(history.points.length)}
                  sub={`${formatShortDate(history.points[0].date)} — ${formatShortDate(history.points[history.points.length - 1].date)}`}
                  delay={680}
                />
              </div>
            )}
          </div>

          {/* ── Right column: map + details ───────────────── */}
          <div className="lg:col-span-2 space-y-8">
            {/* Map (taller) */}
            <GoogleMapEmbed
              placeId={offer.googlePlaceId}
              hotelName={offer.name}
              city={offer.city}
              country={offer.country}
              tall
            />

            {/* Offer details */}
            <section
              className="opacity-0"
              style={{
                animation:
                  "heroReveal 0.5s cubic-bezier(.22,1,.36,1) 0.5s forwards",
              }}
            >
              <h2 className="font-display text-xl text-sand-bright mb-3">
                Szczegoly oferty
              </h2>
              <div className="bg-bg-card border border-sand/5 rounded-sm divide-y divide-sand/5">
                <DetailRow label="Organizator" value={offer.tourOperator} />
                <DetailRow
                  label="Termin"
                  value={`${formatDate(offer.departureDate)} — ${formatDate(offer.returnDate)}`}
                />
                <DetailRow label="Dlugosc" value={`${offer.duration} dni`} />
                <DetailRow
                  label="Polecenia"
                  value={String(offer.ratingRecommends)}
                />
                <DetailRow
                  label="Rezerwacje"
                  value={String(offer.ratingReservationCount)}
                />
                {offer.employeeRatingCount > 0 && (
                  <DetailRow
                    label="Oceny pracownikow"
                    value={String(offer.employeeRatingCount)}
                  />
                )}
              </div>
            </section>

          </div>
        </div>

        {/* ── Full-width variants section ──────────────────── */}
        <div className="mt-8">
          <OfferVariants offer={offer} />
        </div>
      </div>
    </div>
  );
}

const SHORT_DAY_NAMES = ["niedz.", "pon.", "wt.", "sr.", "czw.", "pt.", "sob."];

function formatTermin(dateStr: string): string {
  const d = new Date(dateStr);
  const day = SHORT_DAY_NAMES[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${day} ${dd}.${mm}`;
}

const MONTH_NAMES = [
  "Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec",
  "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien",
] as const;

function OfferVariants({ offer }: { offer: import("@smartwakacje/shared").Offer }) {
  const offerId = offer.id;
  // @ts-expect-error - tRPC type inference issue with monorepo
  const mutation = trpc.variants.fetchVariants.useMutation();
  // @ts-expect-error - tRPC type inference issue with monorepo
  const enrichMutation = trpc.variants.enrichVariants.useMutation();
  const [month, setMonth] = useState(6);
  const [cityFilter, setCityFilter] = useState<string | null>("Katowice");
  const [nightsFilter, setNightsFilter] = useState<Set<number>>(new Set());
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [sortKey, setSortKey] = useState<"date" | "nights" | "price" | "pricePerNight">("price");
  const [sortAsc, setSortAsc] = useState(true);
  const [enrichedVariants, setEnrichedVariants] = useState<import("@smartwakacje/shared").OfferVariant[]>([]);

  const variants = enrichedVariants.length > 0 ? enrichedVariants : (mutation.data ?? []);
  const sorted = useMemo(() => [...variants].sort((a, b) => a.totalPrice - b.totalPrice), [variants]);

  const hasFlightTimes = sorted.some((v) => v.departureTime);

  // Auto-enrich after base variants load
  useEffect(() => {
    if (!mutation.data || mutation.data.length === 0) return;
    if (enrichedVariants.length > 0) return;
    if (!offer.hotelId || !offer.tourOpCode || !offer.tourOperatorId) return;

    enrichMutation.mutate(
      {
        offerId,
        variants: mutation.data,
        hotelId: offer.hotelId,
        tourOp: offer.tourOpCode,
        tourId: offer.tourOperatorId,
      },
      {
        onSuccess: (data: import("@smartwakacje/shared").OfferVariant[]) => {
          setEnrichedVariants(data);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.data]);

  const toggleSort = useCallback((key: typeof sortKey) => {
    setSortKey((prev) => {
      if (prev === key) setSortAsc((a) => !a);
      else setSortAsc(true);
      return key;
    });
  }, []);

  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of sorted) {
      const city = v.departureCity || "Inne";
      counts.set(city, (counts.get(city) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [sorted]);

  const effectiveFilter = useMemo(() => {
    if (cityFilter && !cities.some(([c]) => c === cityFilter)) return null;
    return cityFilter;
  }, [cityFilter, cities]);

  const cityFiltered = useMemo(
    () => effectiveFilter ? sorted.filter((v) => (v.departureCity || "Inne") === effectiveFilter) : sorted,
    [sorted, effectiveFilter],
  );

  const nightsCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const v of cityFiltered) {
      const n = v.numberOfNights || v.duration - 1;
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0] - b[0]);
  }, [cityFiltered]);

  const filtered = useMemo(() => {
    let base = cityFiltered;
    if (dateFrom) base = base.filter((v) => v.departureDate.slice(0, 10) >= dateFrom);
    if (dateTo) base = base.filter((v) => v.departureDate.slice(0, 10) <= dateTo);
    if (nightsFilter.size > 0) base = base.filter((v) => nightsFilter.has(v.numberOfNights || v.duration - 1));
    const dir = sortAsc ? 1 : -1;
    return [...base].sort((a, b) => {
      switch (sortKey) {
        case "date": return dir * (a.departureDate.localeCompare(b.departureDate));
        case "nights": return dir * ((a.numberOfNights || a.duration - 1) - (b.numberOfNights || b.duration - 1));
        case "price": return dir * (a.totalPrice - b.totalPrice);
        case "pricePerNight": {
          const aN = a.numberOfNights || a.duration - 1;
          const bN = b.numberOfNights || b.duration - 1;
          return dir * ((aN > 0 ? a.totalPrice / aN : 0) - (bN > 0 ? b.totalPrice / bN : 0));
        }
        default: return 0;
      }
    });
  }, [cityFiltered, nightsFilter, dateFrom, dateTo, sortKey, sortAsc]);

  const minPrice = sorted.length > 0 ? sorted[0].totalPrice : 0;

  const copyAsMarkdown = useCallback(() => {
    const hasFlight = filtered.some((v) => v.departureTime);
    const header = hasFlight
      ? "| Termin | Noce | Wylot | Powrot | Miasto | Pokoj | Wyzywienie | Cena | Cena/noc |"
      : "| Termin | Noce | Miasto wylotu | Wyzywienie | Cena | Cena/noc |";
    const sep = hasFlight
      ? "|---|---|---|---|---|---|---|---|---|"
      : "|---|---|---|---|---|---|";
    const rows = filtered.map((v) => {
      const nights = v.numberOfNights || v.duration - 1;
      const pricePerNight = nights > 0 ? Math.round(v.totalPrice / nights) : 0;
      const termin = `${v.departureDate ? formatTermin(v.departureDate) : ""} – ${v.returnDate ? formatTermin(v.returnDate) : ""}`;
      if (hasFlight) {
        const dep = v.departureTime && v.arrivalTime ? `${v.departureTime}→${v.arrivalTime}` : "";
        const ret = v.returnDepartTime && v.returnArrivalTime ? `${v.returnDepartTime}→${v.returnArrivalTime}` : "";
        return `| ${termin} | ${nights} | ${dep} | ${ret} | ${v.departureCity} | ${v.roomDesc ?? ""} | ${v.serviceDesc} | ${v.totalPrice.toLocaleString("pl")} zl | ${pricePerNight.toLocaleString("pl")} zl |`;
      }
      return `| ${termin} | ${nights} | ${v.departureCity} | ${v.serviceDesc} | ${v.totalPrice.toLocaleString("pl")} zl | ${pricePerNight.toLocaleString("pl")} zl |`;
    });
    navigator.clipboard.writeText([header, sep, ...rows].join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [filtered]);

  return (
    <section
      className="opacity-0"
      style={{ animation: "heroReveal 0.5s cubic-bezier(.22,1,.36,1) 0.55s forwards" }}
    >
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-display text-xl text-sand-bright">Warianty wyjazdu</h2>
        {sorted.length > 0 && (
          <button
            type="button"
            onClick={copyAsMarkdown}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-sand-dim hover:text-sand-bright border border-sand/10 hover:border-sand/20 transition-colors"
            title="Kopiuj jako markdown"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {copied ? "Skopiowano!" : "Markdown"}
          </button>
        )}
        {enrichMutation.isPending && (
          <span className="text-[10px] text-sand-dim animate-pulse">Pobieranie lotow...</span>
        )}
      </div>

      <div className="bg-bg-card border border-sand/5 rounded-sm p-4">
        {!mutation.data && (
          <div className="text-center py-4 flex items-center justify-center gap-3">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-2 py-2 rounded-sm text-xs bg-bg-card border border-sand/10 text-sand-bright"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => mutation.mutate({ offerId, month })}
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-sm text-xs font-semibold bg-accent text-white hover:bg-accent-glow transition-colors disabled:opacity-40"
            >
              {mutation.isPending ? "Pobieranie..." : "Sprawdz warianty wyjazdu"}
            </button>
            {mutation.isError && (
              <p className="mt-2 text-xs text-red">{(mutation.error as Error).message}</p>
            )}
          </div>
        )}

        {sorted.length > 0 && (
          <>
            {/* City filter chips */}
            {cities.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => setCityFilter(null)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    effectiveFilter === null
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "text-sand-dim border border-sand/10 hover:border-sand/20"
                  }`}
                >
                  Wszystkie ({sorted.length})
                </button>
                {cities.map(([city, count]) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setCityFilter(city)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      effectiveFilter === city
                        ? "bg-accent/20 text-accent border border-accent/30"
                        : "text-sand-dim border border-sand/10 hover:border-sand/20"
                    }`}
                  >
                    {city} ({count})
                  </button>
                ))}
              </div>
            )}

            {/* Nights filter chips */}
            {nightsCounts.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => setNightsFilter(new Set())}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    nightsFilter.size === 0
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "text-sand-dim border border-sand/10 hover:border-sand/20"
                  }`}
                >
                  Wszystkie noce ({cityFiltered.length})
                </button>
                {nightsCounts.map(([nights, count]) => {
                  const active = nightsFilter.has(nights);
                  return (
                    <button
                      key={nights}
                      type="button"
                      onClick={() => {
                        setNightsFilter((prev) => {
                          const next = new Set(prev);
                          if (next.has(nights)) next.delete(nights);
                          else next.add(nights);
                          return next;
                        });
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                        active
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : "text-sand-dim border border-sand/10 hover:border-sand/20"
                      }`}
                    >
                      {nights} nocy ({count})
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-3 mb-2">
              <label className="text-[11px] text-sand-dim flex items-center gap-1">
                Od
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent border border-sand/10 rounded px-1.5 py-0.5 text-[11px] text-sand-bright focus:outline-none focus:border-accent/40"
                />
              </label>
              <label className="text-[11px] text-sand-dim flex items-center gap-1">
                Do
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent border border-sand/10 rounded px-1.5 py-0.5 text-[11px] text-sand-bright focus:outline-none focus:border-accent/40"
                />
              </label>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="text-[10px] text-sand-dim hover:text-sand-bright transition-colors"
                >
                  Wyczysc
                </button>
              )}
            </div>

            <div className="text-[11px] text-sand-dim mb-2">{filtered.length} wariantow</div>

            <div className="max-h-[600px] overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-bg-card">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-sand-dim font-bold border-b border-sand/10">
                    <th className="py-2 pr-3 cursor-pointer select-none hover:text-sand-bright transition-colors" onClick={() => toggleSort("date")}>
                      Termin {sortKey === "date" ? (sortAsc ? "\u2191" : "\u2193") : ""}
                    </th>
                    <th className="py-2 pr-3 cursor-pointer select-none hover:text-sand-bright transition-colors" onClick={() => toggleSort("nights")}>
                      Noce {sortKey === "nights" ? (sortAsc ? "\u2191" : "\u2193") : ""}
                    </th>
                    {hasFlightTimes && <th className="py-2 pr-3">Wylot</th>}
                    {hasFlightTimes && <th className="py-2 pr-3">Powrot</th>}
                    <th className="py-2 pr-3">Miasto wylotu</th>
                    {hasFlightTimes && <th className="py-2 pr-3">Pokoj</th>}
                    <th className="py-2 pr-3">Wyzywienie</th>
                    <th className="py-2 pr-3 text-right cursor-pointer select-none hover:text-sand-bright transition-colors" onClick={() => toggleSort("price")}>
                      Cena {sortKey === "price" ? (sortAsc ? "\u2191" : "\u2193") : ""}
                    </th>
                    <th className="py-2 text-right cursor-pointer select-none hover:text-sand-bright transition-colors" onClick={() => toggleSort("pricePerNight")}>
                      Cena/noc {sortKey === "pricePerNight" ? (sortAsc ? "\u2191" : "\u2193") : ""}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v, i) => {
                    const isCheapest = v.totalPrice === minPrice;
                    const nights = v.numberOfNights || v.duration - 1;
                    const pricePerNight = nights > 0 ? Math.round(v.totalPrice / nights) : 0;
                    return (
                      <tr
                        key={v.id}
                        className={`border-b border-sand/5 transition-colors hover:bg-sand/[0.04] opacity-0 ${
                          isCheapest ? "bg-emerald-500/[0.04]" : i % 2 === 1 ? "bg-sand/[0.02]" : ""
                        }`}
                        style={{
                          animation: `cardIn 0.35s cubic-bezier(.22,1,.36,1) ${0.03 * Math.min(i, 20)}s forwards`,
                        }}
                      >
                        <td className="py-2 pr-3 whitespace-nowrap text-sand-bright font-medium">
                          {v.departureDate ? formatTermin(v.departureDate) : ""} – {v.returnDate ? formatTermin(v.returnDate) : ""}
                        </td>
                        <td className="py-2 pr-3 text-sand">{nights}</td>
                        {hasFlightTimes && (
                          <td className="py-2 pr-3 text-sand-dim whitespace-nowrap">
                            {v.departureTime && v.arrivalTime ? `${v.departureTime}→${v.arrivalTime}` : "–"}
                          </td>
                        )}
                        {hasFlightTimes && (
                          <td className="py-2 pr-3 text-sand-dim whitespace-nowrap">
                            {v.returnDepartTime && v.returnArrivalTime ? `${v.returnDepartTime}→${v.returnArrivalTime}` : "–"}
                          </td>
                        )}
                        <td className="py-2 pr-3 text-sand">{v.departureCity}</td>
                        {hasFlightTimes && (
                          <td className="py-2 pr-3 text-sand-dim text-[10px]">{v.roomDesc ?? "–"}</td>
                        )}
                        <td className="py-2 pr-3 text-sand-dim">{v.serviceDesc}</td>
                        <td className={`py-2 pr-3 text-right whitespace-nowrap font-medium ${isCheapest ? "text-emerald-400" : "text-sand-bright"}`}>
                          {v.totalPrice.toLocaleString("pl")} zl
                          {isCheapest && (
                            <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-400/80">
                              Najtanszy
                            </span>
                          )}
                        </td>
                        <td className={`py-2 text-right whitespace-nowrap ${isCheapest ? "text-emerald-400/70" : "text-sand-dim"}`}>
                          {pricePerNight.toLocaleString("pl")} zl
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {mutation.data && sorted.length === 0 && (
          <p className="text-sm text-sand-dim text-center py-4">Brak wariantow</p>
        )}
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-xs uppercase tracking-wider text-sand-dim font-bold">
        {label}
      </span>
      <span className="text-sm text-sand-bright font-medium">{value}</span>
    </div>
  );
}
