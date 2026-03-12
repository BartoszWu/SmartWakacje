import { useState, useCallback, useMemo } from "react";
import type { Offer, OfferVariant } from "@smartwakacje/shared";
import { useStore } from "../store/useStore";
import { trpc } from "../trpc";
import { FavoriteButton } from "./FavoriteButton";
import { Stars } from "./Stars";
import { formatDate } from "@smartwakacje/shared";

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

// departurePlace IDs for offerConfiguratorV2 API
const CITY_OPTIONS: { label: string; id: number }[] = [
  { label: "Katowice", id: 2622 },
  { label: "Warszawa", id: 2631 },
  { label: "Krakow", id: 2625 },
  { label: "Wroclaw", id: 2634 },
  { label: "Poznan", id: 2628 },
  { label: "Gdansk", id: 2620 },
];

function useFilteredVariants(variants: OfferVariant[], nightsSet: Set<number>, dateFrom: string, dateTo: string) {
  return useMemo(() => {
    const filtered = variants.filter((v) => {
      const nights = v.numberOfNights || v.duration - 1;
      if (nightsSet.size > 0 && !nightsSet.has(nights)) return false;
      if (dateFrom && v.departureDate < dateFrom) return false;
      if (dateTo && v.departureDate > dateTo) return false;
      return true;
    });
    return [...filtered].sort((a, b) => a.totalPrice - b.totalPrice);
  }, [variants, nightsSet, dateFrom, dateTo]);
}

/* ── Rating pill helper ── */
function RatingPill({ label, value, count }: { label: string; value?: number; count?: number }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-sand-dim">
      <span className="font-bold text-sand-bright">{label}</span>
      <span className="text-accent font-semibold">{value.toFixed(1)}</span>
      {count != null && <span className="text-sand-dim/50">{count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}</span>}
    </span>
  );
}

/* ── Inline variants table ── */
function VariantsTable({ sorted }: { sorted: OfferVariant[] }) {
  if (sorted.length === 0) {
    return <p className="text-xs text-sand-dim/40 py-3 text-center">Brak wariantow dla wybranych filtrow</p>;
  }

  const minPrice = sorted[0].totalPrice;
  const hasFlight = sorted.some((v) => v.departureTime);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="text-sand-dim/50 text-[10px] uppercase tracking-wider">
            <th className="text-left py-1.5 pr-3 font-medium">Termin</th>
            <th className="text-left py-1.5 pr-3 font-medium">Noce</th>
            {hasFlight && <th className="text-left py-1.5 pr-3 font-medium">Wylot</th>}
            {hasFlight && <th className="text-left py-1.5 pr-3 font-medium">Powrot</th>}
            {hasFlight && <th className="text-left py-1.5 pr-3 font-medium">Pokoj</th>}
            <th className="text-left py-1.5 pr-3 font-medium">Wyzywienie</th>
            <th className="text-right py-1.5 pr-3 font-medium">Cena</th>
            <th className="text-right py-1.5 font-medium">Cena/noc</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((v, i) => {
            const nights = v.numberOfNights || v.duration - 1;
            const pricePerNight = nights > 0 ? Math.round(v.totalPrice / nights) : 0;
            const isCheapest = v.totalPrice === minPrice;
            return (
              <tr
                key={v.id}
                className={`border-t border-sand/5 transition-colors hover:bg-sand/3 ${isCheapest ? "bg-accent/[0.04]" : ""}`}
                style={{ animationDelay: `${i * 15}ms` }}
              >
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  {v.departureDate ? formatTermin(v.departureDate) : ""} – {v.returnDate ? formatTermin(v.returnDate) : ""}
                </td>
                <td className="py-1.5 pr-3 text-center">{nights}</td>
                {hasFlight && (
                  <td className="py-1.5 pr-3 whitespace-nowrap text-sand-dim">
                    {v.departureTime && v.arrivalTime ? `${v.departureTime}\u2192${v.arrivalTime}` : "\u2014"}
                  </td>
                )}
                {hasFlight && (
                  <td className="py-1.5 pr-3 whitespace-nowrap text-sand-dim">
                    {v.returnDepartTime && v.returnArrivalTime ? `${v.returnDepartTime}\u2192${v.returnArrivalTime}` : "\u2014"}
                  </td>
                )}
                {hasFlight && (
                  <td className="py-1.5 pr-3 text-sand-dim max-w-[200px] truncate">{v.roomDesc ?? "\u2014"}</td>
                )}
                <td className="py-1.5 pr-3 text-sand-dim">{v.serviceDesc}</td>
                <td className={`py-1.5 pr-3 text-right font-semibold tabular-nums ${isCheapest ? "text-accent" : "text-sand-bright"}`}>
                  {v.totalPrice.toLocaleString("pl")} zl
                </td>
                <td className="py-1.5 text-right text-sand-dim tabular-nums">
                  {pricePerNight.toLocaleString("pl")} zl
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Hotel accordion row ── */
function FavoriteRow({
  offer,
  delay,
  variants,
  nightsSet,
  dateFrom,
  dateTo,
}: {
  offer: Offer;
  delay: number;
  variants?: OfferVariant[];
  nightsSet: Set<number>;
  dateFrom: string;
  dateTo: string;
}) {
  const openOfferDetail = useStore((s) => s.openOfferDetail);
  const [manualClose, setManualClose] = useState(false);
  // Auto-expand when variants arrive, collapse only on manual click
  const expanded = variants != null && variants.length > 0 && !manualClose;

  const allPhotos = offer.photos?.length ? offer.photos : offer.photo ? [offer.photo] : [];
  const placeholder = `https://placehold.co/120x80/1e1e22/a89b88?text=${encodeURIComponent(offer.name.slice(0, 8))}`;
  const [photoIdx, setPhotoIdx] = useState(0);
  const photoUrl = allPhotos[photoIdx] || placeholder;

  const handleImgError = useCallback(() => {
    setPhotoIdx((prev) => {
      const next = prev + 1;
      return next < allPhotos.length ? next : allPhotos.length;
    });
  }, [allPhotos.length]);

  const sorted = useFilteredVariants(variants ?? [], nightsSet, dateFrom, dateTo);
  const minPrice = sorted.length > 0 ? sorted[0].totalPrice : null;
  const hasVariants = variants != null;
  const variantCount = sorted.length;

  return (
    <div
      className="rounded border border-sand/5 overflow-hidden opacity-0 translate-y-3"
      style={{
        animation: `cardIn 0.35s cubic-bezier(.22,1,.36,1) ${delay}ms forwards`,
      }}
    >
      {/* Collapsed header row */}
      <div
        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors select-none ${
          expanded ? "bg-bg-card border-b border-sand/5" : "bg-bg-card hover:bg-bg-raised"
        }`}
        onClick={() => hasVariants && setManualClose((c) => !c)}
      >
        {/* Thumbnail */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openOfferDetail(offer); }}
          className="relative w-28 h-20 rounded overflow-hidden shrink-0 border-0 p-0 cursor-pointer group"
        >
          <img
            src={photoUrl}
            alt={offer.name}
            loading="lazy"
            onError={handleImgError}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </button>

        {/* Hotel name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openOfferDetail(offer); }}
              className="font-display text-base text-sand-bright leading-tight truncate bg-transparent border-0 p-0 cursor-pointer hover:text-accent transition-colors text-left"
            >
              {offer.name}
            </button>
            <Stars count={offer.category} />
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <FavoriteButton name={offer.name} hotelId={offer.hotelId} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-sand-dim">{offer.country} / {offer.region}</span>
            <span className="text-xs text-sand-dim">{offer.tourOperator} · {offer.duration}d</span>
            <RatingPill label="G" value={offer.googleRating} count={offer.googleRatingsTotal} />
            <RatingPill label="TV" value={offer.trivagoRating} count={offer.trivagoReviewsCount} />
            <RatingPill label="TA" value={offer.taRating} count={offer.taReviewCount} />
            <RatingPill label="W" value={offer.ratingValue} count={offer.ratingReservationCount} />
          </div>
        </div>

        {/* Price */}
        <div className="shrink-0 text-right">
          <div className="font-display text-lg text-sand-bright tabular-nums">
            {offer.price.toLocaleString("pl")}
            <small className="text-xs text-sand-dim ml-0.5">zl</small>
          </div>
          <div className="text-xs font-semibold text-accent">
            {offer.pricePerPerson.toLocaleString("pl")} zl/os
          </div>
        </div>

        {/* Variant summary badge */}
        <div className="shrink-0 w-36 text-right">
          {hasVariants ? (
            variantCount > 0 ? (
              <div className="inline-flex items-center gap-2">
                <span className="text-xs text-sand-dim">{variantCount} war.</span>
                <span className="text-sm font-semibold text-accent tabular-nums">
                  od {minPrice!.toLocaleString("pl")} zl
                </span>
                <svg
                  className={`w-3 h-3 text-sand-dim transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            ) : (
              <span className="text-[10px] text-sand-dim/40">brak wynikow</span>
            )
          ) : (
            <span className="text-[10px] text-sand-dim/30">&mdash;</span>
          )}
        </div>
      </div>

      {/* Expanded variant table */}
      {expanded && hasVariants && (
        <div className="bg-bg px-4 py-3">
          <VariantsTable sorted={sorted} />
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export function FavoritesPage() {
  const offers = useStore((s) => s.offers);
  const favorites = useStore((s) => s.favorites);
  const compareList = useStore((s) => s.compareList);
  const openCompare = useStore((s) => s.openCompare);
  const goBackToOffers = useStore((s) => s.goBackToOffers);
  const goHome = useStore((s) => s.goHome);
  const activeSnapshotId = useStore((s) => s.activeSnapshotId);

  // Batch variant state
  const [month, setMonth] = useState(6);
  const [nightsSet, setNightsSet] = useState<Set<number>>(new Set([7, 8]));
  const [city, setCity] = useState<number>(2622);
  const [dateFrom, setDateFrom] = useState("2026-06-15");
  const [dateTo, setDateTo] = useState("2026-06-28");
  const [maxEnrichGroups, setMaxEnrichGroups] = useState(40);
  const [batchResults, setBatchResults] = useState<Record<string, OfferVariant[]> | null>(null);
  const [copied, setCopied] = useState(false);

  // @ts-expect-error - tRPC type inference issue with monorepo
  const batchMutation = trpc.variants.fetchBatchVariants.useMutation();

  const favoriteOffers = useMemo(() => {
    const cheapest = new Map<string, Offer>();
    for (const o of offers) {
      if (!favorites.has(o.name)) continue;
      const existing = cheapest.get(o.name);
      if (!existing || o.price < existing.price) {
        cheapest.set(o.name, o);
      }
    }
    return [...cheapest.values()];
  }, [offers, favorites]);

  const toggleNight = (n: number) => {
    setNightsSet((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const handleFetchBatch = () => {
    if (favoriteOffers.length === 0) return;

    const offerData = favoriteOffers.map((o) => ({
      offerId: o.id,
      hotelId: o.hotelId,
      tourOp: o.tourOpCode,
      tourId: o.tourOperatorId,
    }));

    setBatchResults(null);
    batchMutation.mutate(
      {
        offers: offerData,
        month,
        departurePlace: [city],
        maxEnrichGroups,
      },
      {
        onSuccess: (data: Record<string, OfferVariant[]>) => {
          setBatchResults(data);
        },
      }
    );
  };

  const copyAllMarkdown = useCallback(() => {
    if (!batchResults) return;
    const lines: string[] = [];
    for (const offer of favoriteOffers) {
      const raw = batchResults[offer.id];
      if (!raw || raw.length === 0) continue;
      const filtered = raw.filter((v) => {
        const nights = v.numberOfNights || v.duration - 1;
        if (nightsSet.size > 0 && !nightsSet.has(nights)) return false;
        if (dateFrom && v.departureDate < dateFrom) return false;
        if (dateTo && v.departureDate > dateTo) return false;
        return true;
      });
      if (filtered.length === 0) continue;
      const sorted = [...filtered].sort((a, b) => a.totalPrice - b.totalPrice);
      const stars = "\u2605".repeat(offer.category);
      const hasFlight = sorted.some((v) => v.departureTime);
      lines.push(`## ${offer.name} ${stars}`);
      if (hasFlight) {
        lines.push("| Termin | Noce | Wylot | Powrot | Miasto | Pokoj | Wyzywienie | Cena | Cena/noc |");
        lines.push("|---|---|---|---|---|---|---|---|---|");
      } else {
        lines.push("| Termin | Noce | Miasto | Wyzywienie | Cena | Cena/noc |");
        lines.push("|---|---|---|---|---|---|");
      }
      for (const v of sorted) {
        const nights = v.numberOfNights || v.duration - 1;
        const pricePerNight = nights > 0 ? Math.round(v.totalPrice / nights) : 0;
        const termin = `${v.departureDate ? formatTermin(v.departureDate) : ""} – ${v.returnDate ? formatTermin(v.returnDate) : ""}`;
        if (hasFlight) {
          const dep = v.departureTime && v.arrivalTime ? `${v.departureTime}\u2192${v.arrivalTime}` : "";
          const ret = v.returnDepartTime && v.returnArrivalTime ? `${v.returnDepartTime}\u2192${v.returnArrivalTime}` : "";
          lines.push(`| ${termin} | ${nights} | ${dep} | ${ret} | ${v.departureCity} | ${v.roomDesc ?? ""} | ${v.serviceDesc} | ${v.totalPrice.toLocaleString("pl")} zl | ${pricePerNight.toLocaleString("pl")} zl |`);
        } else {
          lines.push(`| ${termin} | ${nights} | ${v.departureCity} | ${v.serviceDesc} | ${v.totalPrice.toLocaleString("pl")} zl | ${pricePerNight.toLocaleString("pl")} zl |`);
        }
      }
      lines.push("");
    }
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [batchResults, favoriteOffers, nightsSet, dateFrom, dateTo]);

  return (
    <div className="min-h-screen bg-bg text-sand font-body relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-bg via-bg/80 to-transparent backdrop-blur-xl pt-5 pb-3 px-8">
        <div className="max-w-[90rem] mx-auto flex items-center justify-between flex-wrap gap-4">
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

          <div className="flex items-center gap-2">
            {compareList.length >= 2 && (
              <button
                type="button"
                onClick={openCompare}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-white text-xs font-bold uppercase tracking-wide hover:bg-accent-glow hover:scale-[1.03] transition-all"
              >
                Porownaj ({compareList.length})
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-[90rem] mx-auto px-8 pb-16">
        {favoriteOffers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-16 h-16 text-sand-dim/30 mb-6">
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
            {/* Filter bar */}
            <div className="mb-4 p-3 bg-bg-card border border-sand/5 rounded flex flex-wrap items-center gap-2.5">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="px-2 py-1.5 rounded text-xs bg-bg border border-sand/10 text-sand-bright"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>

              <select
                value={city}
                onChange={(e) => setCity(Number(e.target.value))}
                className="px-2 py-1.5 rounded text-xs bg-bg border border-sand/10 text-sand-bright"
              >
                {CITY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-sand-dim/60 mr-0.5">Noce</span>
                {[5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleNight(n)}
                    className={`w-6 h-6 rounded text-[10px] font-semibold transition-all ${
                      nightsSet.has(n)
                        ? "bg-accent/20 text-accent border border-accent/30"
                        : "text-sand-dim/40 border border-sand/8 hover:border-sand/15 hover:text-sand-dim"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-sand-dim/60">Od</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-1.5 py-1 rounded text-xs bg-bg border border-sand/10 text-sand-bright"
                />
                <span className="text-[10px] text-sand-dim/60">Do</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-1.5 py-1 rounded text-xs bg-bg border border-sand/10 text-sand-bright"
                />
              </div>

              {/* Max enrich groups */}
              <div className="flex items-center gap-1 relative group/tip">
                <span className="text-[10px] text-sand-dim/60">Loty</span>
                <input
                  type="number"
                  min={10}
                  max={200}
                  step={10}
                  value={maxEnrichGroups}
                  onChange={(e) => setMaxEnrichGroups(Math.max(10, Math.min(200, Number(e.target.value) || 40)))}
                  className="w-14 px-1.5 py-1 rounded text-xs bg-bg border border-sand/10 text-sand-bright text-center tabular-nums"
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded bg-bg-raised border border-sand/10 text-[10px] text-sand-dim leading-relaxed w-56 opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity z-50 shadow-lg">
                  Max zapytan o godziny lotow per hotel. Kazda unikalna data wylotu = 1 zapytanie. Podnieś do 100-200 jesli pobierasz dla wielu miast.
                </div>
              </div>

              <button
                type="button"
                onClick={handleFetchBatch}
                disabled={batchMutation.isPending}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-accent text-white hover:bg-accent-glow transition-colors disabled:opacity-40"
              >
                {batchMutation.isPending ? "Pobieranie..." : "Pobierz warianty"}
              </button>

              {batchResults && (
                <button
                  type="button"
                  onClick={copyAllMarkdown}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-medium text-sand-dim hover:text-sand-bright border border-sand/10 hover:border-sand/20 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  {copied ? "Skopiowano!" : "Kopiuj MD"}
                </button>
              )}

              {batchMutation.isError && (
                <p className="text-xs text-red">{(batchMutation.error as Error).message}</p>
              )}
            </div>

            {/* Hotel list */}
            <div className="flex flex-col gap-1.5">
              {favoriteOffers.map((offer, i) => (
                <FavoriteRow
                  key={offer.name}
                  offer={offer}
                  delay={i * 30}
                  variants={batchResults?.[offer.id]}
                  nightsSet={nightsSet}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
