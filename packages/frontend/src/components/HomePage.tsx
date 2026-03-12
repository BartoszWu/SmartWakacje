import React from "react";
import { trpc } from "../trpc";
import { useStore, buildSnapshotPath } from "../store/useStore";
import {
  AIRPORT_IDS,
  COUNTRY_IDS,
  SERVICE_TYPES,
  ATTRIBUTE_IDS,
  DEFAULT_SCRAPER_CONFIG,
} from "@smartwakacje/shared";
import type { SnapshotMeta } from "@smartwakacje/shared";
import { ScrapeProgressOverlay } from "./ScrapeProgressOverlay";
import { ThemeToggle } from "./ThemeToggle";

const airportEntries = Object.entries(AIRPORT_IDS);
const countryEntries = Object.entries(COUNTRY_IDS);
const serviceEntries = Object.entries(SERVICE_TYPES);
const attributeEntries = Object.entries(ATTRIBUTE_IDS);

function formatSnapshotDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateRange(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${f.toLocaleDateString("pl-PL", opts)} — ${t.toLocaleDateString("pl-PL", opts)}`;
}

function countryIdsToNames(ids: number[]): string[] {
  const idToName: Record<number, string> = {};
  for (const [name, id] of countryEntries) idToName[id] = name;
  return ids.map((id) => idToName[id]).filter(Boolean);
}

export function HomePage() {
  const openSnapshot = useStore((s) => s.openSnapshot);

  // Form state
  const [dateFrom, setDateFrom] = React.useState<string>(DEFAULT_SCRAPER_CONFIG.departureDateFrom);
  const [dateTo, setDateTo] = React.useState<string>(DEFAULT_SCRAPER_CONFIG.departureDateTo);
  const [airports, setAirports] = React.useState<number[]>([...DEFAULT_SCRAPER_CONFIG.airports]);
  const [countries, setCountries] = React.useState<number[]>([...DEFAULT_SCRAPER_CONFIG.countries]);
  const [service, setService] = React.useState<number>(DEFAULT_SCRAPER_CONFIG.service);
  const [adults, setAdults] = React.useState<number>(DEFAULT_SCRAPER_CONFIG.adults);
  const [children, setChildren] = React.useState<number>(DEFAULT_SCRAPER_CONFIG.children);
  const [childAges, setChildAges] = React.useState<string[]>([...DEFAULT_SCRAPER_CONFIG.childAges]);
  const [attributes, setAttributes] = React.useState<number[]>([...DEFAULT_SCRAPER_CONFIG.attributes]);
  const [minPrice, setMinPrice] = React.useState<string>(String(DEFAULT_SCRAPER_CONFIG.minPrice));
  const [maxPrice, setMaxPrice] = React.useState<string>(String(DEFAULT_SCRAPER_CONFIG.maxPrice));
  const [fetchDescriptions, setFetchDescriptions] = React.useState(true);

  // Scraping state
  const [isScraping, setIsScraping] = React.useState(false);
  const [pendingMeta, setPendingMeta] = React.useState<SnapshotMeta | null>(null);

  // @ts-expect-error - tRPC type inference issue with monorepo
  const utils = trpc.useUtils();
  // @ts-expect-error - tRPC type inference issue with monorepo
  const snapshotsQuery = trpc.snapshots.list.useQuery(undefined, {
    refetchOnMount: true,
  });
  // @ts-expect-error - tRPC type inference issue with monorepo
  const scrapeMutation = trpc.snapshots.scrape.useMutation();

  const snapshots: SnapshotMeta[] = snapshotsQuery.data ?? [];

  function toggleInArray(arr: number[], val: number): number[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
  }

  async function handleScrape() {
    if (airports.length === 0 || countries.length === 0) return;
    setIsScraping(true);
    setPendingMeta(null);
    try {
      const meta = await scrapeMutation.mutateAsync({
        departureDateFrom: dateFrom,
        departureDateTo: dateTo,
        airports,
        countries,
        service,
        adults,
        children,
        childAges: childAges.slice(0, children),
        attributes,
        pageSize: 50,
        delayBetweenPages: 1000,
        ...(minPrice ? { minPrice: Number(minPrice) } : {}),
        ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
        fetchDescriptions,
      });
      utils.snapshots.list.invalidate();
      setPendingMeta(meta);
      // Don't navigate yet — let overlay decide (clean finish vs warnings)
      // If no warnings, server calls finishScrapeProgress() and overlay auto-navigates
      // If warnings, overlay shows summary with retry/continue buttons
    } catch (err) {
      console.error("Scrape failed:", err);
      setIsScraping(false);
    }
  }

  function handleOverlayContinue(snapshotId: string) {
    utils.snapshots.list.invalidate();
    const meta = pendingMeta?.id === snapshotId ? pendingMeta : undefined;
    setIsScraping(false);
    setPendingMeta(null);
    openSnapshot(snapshotId, meta || undefined);
  }

  function handleChildrenChange(n: number) {
    setChildren(n);
    const newAges = [...childAges];
    while (newAges.length < n) newAges.push("20200101");
    setChildAges(newAges.slice(0, n));
  }

  function handleChildAgeChange(idx: number, val: string) {
    const next = [...childAges];
    next[idx] = val;
    setChildAges(next);
  }

  // Scraping overlay
  if (isScraping) {
    return (
      <ScrapeProgressOverlay
        completedSnapshotId={pendingMeta?.id ?? null}
        onContinue={handleOverlayContinue}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg text-sand relative">
      {/* Hero */}
      <header className="pt-12 pb-8 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-5xl text-sand-bright tracking-tight mb-2">
                Smart<span className="text-accent">Wakacje</span>
              </h1>
              <p className="text-sand-dim text-sm max-w-md leading-relaxed">
                Wyszukaj oferty wakacyjne z wakacje.pl, porownaj ceny i oceny z Google Maps, TripAdvisor i Trivago.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Scraper form ── */}
          <div className="lg:col-span-3">
            <div className="bg-bg-card rounded-[16px] border border-sand/8 p-6">
              <h2 className="font-display text-xl text-sand-bright mb-6 flex items-center gap-2">
                <span className="w-1 h-5 bg-accent rounded-full inline-block" />
                Nowe wyszukiwanie
              </h2>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-widest text-sand-dim font-semibold mb-1.5 block">
                    Wyjazd od
                  </span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-bg-raised border border-sand/10 rounded-sm px-3 py-2 text-sand-bright text-sm focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-widest text-sand-dim font-semibold mb-1.5 block">
                    Wyjazd do
                  </span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-bg-raised border border-sand/10 rounded-sm px-3 py-2 text-sand-bright text-sm focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </label>
              </div>

              {/* Airports */}
              <fieldset className="mb-5">
                <legend className="text-[11px] uppercase tracking-widest text-sand-dim font-semibold mb-2">
                  Lotniska
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {airportEntries.map(([name, id]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAirports(toggleInArray(airports, id))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        airports.includes(id)
                          ? "bg-accent/20 text-accent border border-accent/40"
                          : "bg-bg-raised text-sand-dim border border-sand/8 hover:border-sand/20"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Countries */}
              <fieldset className="mb-5">
                <legend className="text-[11px] uppercase tracking-widest text-sand-dim font-semibold mb-2">
                  Kraje
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {countryEntries.map(([name, id]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCountries(toggleInArray(countries, id))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        countries.includes(id)
                          ? "bg-accent/20 text-accent border border-accent/40"
                          : "bg-bg-raised text-sand-dim border border-sand/8 hover:border-sand/20"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Service type */}
              <div className="mb-5">
                <span className="text-[11px] uppercase tracking-widest text-sand-dim font-semibold mb-1.5 block">
                  Wyzywienie
                </span>
                <select
                  value={service}
                  onChange={(e) => setService(Number(e.target.value))}
                  className="bg-bg-raised border border-sand/10 rounded-sm px-3 py-2 text-sand-bright text-sm focus:outline-none focus:border-accent/50 transition-colors w-full"
                >
                  {serviceEntries.map(([name, id]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price range */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-widest text-sand-dim font-semibold mb-1.5 block">
                    Cena od (PLN)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    placeholder="np. 8000"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-bg-raised border border-sand/10 rounded-sm px-3 py-2 text-sand-bright text-sm focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-widest text-sand-dim font-semibold mb-1.5 block">
                    Cena do (PLN)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    placeholder="np. 14000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full bg-bg-raised border border-sand/10 rounded-sm px-3 py-2 text-sand-bright text-sm focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </label>
              </div>
              <p className="text-[10px] text-sand-dim/60 -mt-3 mb-5">Cena calkowita za pokoj (nie za osobe)</p>

              {/* Amenities */}
              <fieldset className="mb-5">
                <legend className="text-[11px] uppercase tracking-widest text-sand-dim font-semibold mb-2">
                  Udogodnienia
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {attributeEntries.map(([name, id]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAttributes(toggleInArray(attributes, id))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        attributes.includes(id)
                          ? "bg-accent/20 text-accent border border-accent/40"
                          : "bg-bg-raised text-sand-dim border border-sand/8 hover:border-sand/20"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Rooms */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-widest text-sand-dim font-semibold mb-1.5 block">
                    Dorosli
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full bg-bg-raised border border-sand/10 rounded-sm px-3 py-2 text-sand-bright text-sm focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-widest text-sand-dim font-semibold mb-1.5 block">
                    Dzieci
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={children}
                    onChange={(e) => handleChildrenChange(Number(e.target.value))}
                    className="w-full bg-bg-raised border border-sand/10 rounded-sm px-3 py-2 text-sand-bright text-sm focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </label>
              </div>

              {/* Child ages */}
              {children > 0 && (
                <div className="mb-5">
                  <span className="text-[11px] uppercase tracking-widest text-sand-dim font-semibold mb-1.5 block">
                    Daty urodzenia dzieci (RRRRMMDD)
                  </span>
                  <div className="flex gap-3">
                    {Array.from({ length: children }).map((_, i) => (
                      <input
                        key={i}
                        type="text"
                        placeholder="20200101"
                        value={childAges[i] || ""}
                        onChange={(e) => handleChildAgeChange(i, e.target.value)}
                        className="w-32 bg-bg-raised border border-sand/10 rounded-sm px-3 py-2 text-sand-bright text-sm focus:outline-none focus:border-accent/50 transition-colors font-mono"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Descriptions toggle */}
              <label className="flex items-center gap-3 mb-5 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => setFetchDescriptions(!fetchDescriptions)}
                  className={`w-9 h-5 rounded-full relative transition-colors ${fetchDescriptions ? "bg-accent" : "bg-sand/20"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${fetchDescriptions ? "translate-x-4" : ""}`} />
                </button>
                <span className="text-sm text-sand-dim">Pobieraj opisy hoteli</span>
              </label>

              {/* Submit */}
              <button
                type="button"
                onClick={handleScrape}
                disabled={airports.length === 0 || countries.length === 0}
                className="w-full mt-2 bg-accent hover:bg-accent-glow disabled:opacity-40 disabled:hover:bg-accent text-white font-semibold py-3 px-6 rounded-sm transition-all text-sm tracking-wide uppercase"
              >
                Pobierz oferty
              </button>
            </div>
          </div>

          {/* ── Snapshot list ── */}
          <div className="lg:col-span-2">
            <h2 className="font-display text-xl text-sand-bright mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-sand-dim/40 rounded-full inline-block" />
              Zapisane wyszukiwania
            </h2>

            {snapshotsQuery.isLoading && (
              <div className="text-sand-dim text-sm">Ladowanie...</div>
            )}

            {snapshots.length === 0 && !snapshotsQuery.isLoading && (
              <div className="bg-bg-card rounded-[16px] border border-sand/8 p-6 text-center">
                <p className="text-sand-dim text-sm">Brak zapisanych wyszukiwan.</p>
                <p className="text-sand-dim/60 text-xs mt-1">Wykonaj pierwsze wyszukiwanie aby je tutaj zobaczyc.</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {snapshots.map((snap: SnapshotMeta, idx: number) => (
                <a
                  key={snap.id}
                  href={buildSnapshotPath(snap.id)}
                  onClick={(e) => {
                    e.preventDefault();
                    openSnapshot(snap.id, snap);
                  }}
                  className="group block bg-bg-card hover:bg-bg-card-hover border border-sand/8 hover:border-accent/30 rounded-[14px] p-4 text-left transition-all w-full no-underline text-inherit"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Date */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sand-bright text-sm font-semibold">
                      {formatSnapshotDate(snap.createdAt)}
                    </span>
                    <span className="text-accent text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Otworz &rarr;
                    </span>
                  </div>

                  {/* Filter summary */}
                  <div className="text-sand-dim text-xs leading-relaxed space-y-0.5">
                    <div>
                      {formatDateRange(snap.filters.departureDateFrom, snap.filters.departureDateTo)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{snap.countries?.join(", ") || countryIdsToNames(snap.filters.countries).join(", ")}</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-sand/6">
                    <div className="text-xs">
                      <span className="text-sand-dim">Oferty </span>
                      <span className="text-sand-bright font-bold">{snap.offerCount}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-sand-dim">Osoby </span>
                      <span className="text-sand-bright font-bold">
                        {snap.filters.adults}+{snap.filters.children}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
