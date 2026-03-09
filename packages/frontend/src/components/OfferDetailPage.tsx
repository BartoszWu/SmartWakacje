import { useStore } from "../store/useStore";
import { trpc } from "../trpc";
import { formatDate } from "@smartwakacje/shared";
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
}) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;

  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#141416" stroke="#d4621a" strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={2.5} fill="#d4621a" />
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
              <stop offset="0%" stopColor="#d4621a" stopOpacity={0.35} />
              <stop offset="50%" stopColor="#d4621a" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#d4621a" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d4621a" stopOpacity={0.6} />
              <stop offset="50%" stopColor="#e8782f" stopOpacity={1} />
              <stop offset="100%" stopColor="#d4621a" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 6"
            stroke="rgba(232,220,200,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: "#a89b88", fontSize: 11, fontFamily: "Libre Franklin" }}
            axisLine={{ stroke: "rgba(232,220,200,0.06)" }}
            tickLine={false}
            dy={8}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: "#a89b88", fontSize: 11, fontFamily: "Libre Franklin" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
            width={48}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: "rgba(232,220,200,0.1)",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />
          <ReferenceLine
            y={avgPrice}
            stroke="rgba(232,220,200,0.08)"
            strokeDasharray="8 4"
            label={{
              value: `sr. ${avgPrice.toLocaleString("pl")}`,
              position: "right",
              fill: "#a89b88",
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
            dot={<CustomDot />}
            activeDot={{
              r: 7,
              fill: "#e8782f",
              stroke: "#141416",
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

export function OfferDetailPage() {
  const offer = useStore((s) => s.activeOffer);
  const goBack = useStore((s) => s.goBackToOffers);

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

  const photoUrl =
    offer.photo ||
    `https://placehold.co/800x400/1e1e22/a89b88?text=${encodeURIComponent(
      offer.name.slice(0, 12)
    )}`;

  return (
    <div className="min-h-screen bg-bg text-sand font-body relative">
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="relative h-72 md:h-80 overflow-hidden">
        <img
          src={photoUrl}
          alt={offer.name}
          className="absolute inset-0 w-full h-full object-cover scale-105 blur-sm opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/60 to-bg" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 h-full flex flex-col justify-end pb-8">
          <button
            type="button"
            onClick={goBack}
            className="absolute top-6 left-6 md:left-8 inline-flex items-center gap-1.5 text-sand-dim hover:text-accent transition-colors text-sm font-medium group"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Powrot do ofert
          </button>

          <div
            className="opacity-0"
            style={{
              animation:
                "heroReveal 0.6s cubic-bezier(.22,1,.36,1) 0.1s forwards",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Stars count={offer.category} />
              {offer.serviceDesc && (
                <span className="px-2.5 py-0.5 rounded-full bg-sand/8 text-sand-dim text-[10px] font-bold uppercase tracking-wide border border-sand/5">
                  {offer.serviceDesc}
                </span>
              )}
              {offer.promoLastMinute && (
                <span className="px-2.5 py-0.5 rounded-full bg-red/15 text-red text-[10px] font-bold uppercase tracking-wide border border-red/20">
                  Last Minute
                </span>
              )}
              {offer.promoFirstMinute && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue/15 text-blue text-[10px] font-bold uppercase tracking-wide border border-blue/20">
                  First Minute
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-sand-bright leading-tight tracking-tight">
              {offer.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-sand-dim">
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
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 md:px-8 pb-16">
        {/* Rating bar — override absolute positioning from RatingBar */}
        <div
          className="relative -mt-5 mb-8 rounded-sm overflow-hidden border border-sand/5 opacity-0 [&>div]:static [&>div]:z-auto"
          style={{
            animation:
              "heroReveal 0.5s cubic-bezier(.22,1,.36,1) 0.25s forwards",
          }}
        >
          <RatingBar offer={offer} />
        </div>

        {/* Price summary row */}
        <div
          className="flex flex-wrap items-end gap-6 mb-8 opacity-0"
          style={{
            animation:
              "heroReveal 0.5s cubic-bezier(.22,1,.36,1) 0.35s forwards",
          }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-widest text-sand-dim font-bold mb-1">
              Aktualna cena
            </div>
            <span className="font-display text-4xl md:text-5xl text-sand-bright">
              {offer.price.toLocaleString("pl")}
              <span className="text-lg text-sand-dim ml-1">zl</span>
            </span>
          </div>
          <div className="mb-1">
            <span className="text-lg font-semibold text-accent">
              {offer.pricePerPerson.toLocaleString("pl")} zl
              <span className="text-xs text-sand-dim ml-1">/ os</span>
            </span>
          </div>
          {history && (
            <div className="mb-2">
              <PriceChangeIndicator
                change={history.priceChange}
                changePercent={history.priceChangePercent}
              />
            </div>
          )}
        </div>

        {/* ── Chart section ──────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
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

        {/* ── Stats grid ─────────────────────────────────── */}
        {history && history.points?.length > 1 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
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

        {/* ── Offer details ──────────────────────────────── */}
        <section
          className="opacity-0"
          style={{
            animation:
              "heroReveal 0.5s cubic-bezier(.22,1,.36,1) 0.5s forwards",
          }}
        >
          <h2 className="font-display text-xl text-sand-bright mb-4">
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
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-xs uppercase tracking-wider text-sand-dim font-bold">
                Wakacje.pl
              </span>
              <a
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-accent text-white text-xs font-bold uppercase tracking-wide hover:bg-accent-glow hover:scale-[1.03] transition-all"
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
        </section>
      </div>
    </div>
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
