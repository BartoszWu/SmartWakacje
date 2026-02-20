import { useStore } from "../store/useStore";

export function FilterBar() {
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const resetFilters = useStore((s) => s.resetFilters);

  const activeCount = [
    filters.priceMin > 0,
    filters.priceMax < Infinity,
    filters.priceTotalMin > 0,
    filters.priceTotalMax < Infinity,
    filters.minRating > 0,
    filters.minGmaps > 0,
    filters.minTrivago > 0,
    filters.minTA > 0,
    filters.minStars > 0,
    filters.minEmployeeRating > 0,
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-8 pb-3 space-y-2 relative z-30">
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-sand-dim">Cena / os (zł)</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="od"
              value={filters.priceMin || ""}
              onChange={(e) => setFilter("priceMin", Number(e.target.value) || 0)}
              className="w-24 py-2 px-3 rounded border border-sand/10 bg-white/5 text-sand-bright text-sm outline-none focus:border-accent"
            />
            <span className="text-sand-dim text-sm px-1">–</span>
            <input
              type="number"
              placeholder="do"
              value={filters.priceMax === Infinity ? "" : filters.priceMax}
              onChange={(e) => setFilter("priceMax", Number(e.target.value) || Infinity)}
              className="w-24 py-2 px-3 rounded border border-sand/10 bg-white/5 text-sand-bright text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-sand-dim">Cena total (zł)</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="od"
              value={filters.priceTotalMin || ""}
              onChange={(e) => setFilter("priceTotalMin", Number(e.target.value) || 0)}
              className="w-24 py-2 px-3 rounded border border-sand/10 bg-white/5 text-sand-bright text-sm outline-none focus:border-accent"
            />
            <span className="text-sand-dim text-sm px-1">–</span>
            <input
              type="number"
              placeholder="do"
              value={filters.priceTotalMax === Infinity ? "" : filters.priceTotalMax}
              onChange={(e) => setFilter("priceTotalMax", Number(e.target.value) || Infinity)}
              className="w-24 py-2 px-3 rounded border border-sand/10 bg-white/5 text-sand-bright text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-sand-dim">Gwiazdki</span>
          <select
            value={filters.minStars}
            onChange={(e) => setFilter("minStars", Number(e.target.value))}
            className="py-2 px-3 rounded border border-sand/10 bg-white/5 text-sand-bright text-sm outline-none cursor-pointer focus:border-accent"
          >
            <option value="0">Wszystkie</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5</option>
          </select>
        </div>

        <div className="flex-1" />

        {activeCount > 0 && (
          <span className="text-xs font-semibold text-accent">{activeCount} aktywnych filtrów</span>
        )}
        <button
          type="button"
          onClick={resetFilters}
          className="py-2 px-4 rounded border border-red/30 text-red text-xs font-semibold hover:bg-red/10 hover:border-red transition-all"
        >
          Resetuj filtry
        </button>
      </div>

      <div className="flex items-center gap-1 py-1 px-2 bg-white/[0.025] border border-sand/5 rounded flex-wrap">
        <FilterPill
          label="W"
          color="text-gold"
          value={filters.minRating}
          options={[
            { value: 0, label: "Wakacje.pl" },
            { value: 6, label: "6+" },
            { value: 7, label: "7+" },
            { value: 7.5, label: "7.5+" },
            { value: 8, label: "8+" },
            { value: 8.5, label: "8.5+" },
            { value: 9, label: "9+" },
          ]}
          onChange={(v) => setFilter("minRating", v)}
        />

        <FilterPill
          label="G"
          color="text-[#6aabf7]"
          value={filters.minGmaps}
          options={[
            { value: 0, label: "GMaps" },
            { value: 3.5, label: "3.5+" },
            { value: 4, label: "4.0+" },
            { value: 4.2, label: "4.2+" },
            { value: 4.5, label: "4.5+" },
            { value: 4.7, label: "4.7+" },
          ]}
          onChange={(v) => setFilter("minGmaps", v)}
        />

        <FilterPill
          label="tv"
          color="text-[#a78bfa]"
          value={filters.minTrivago}
          options={[
            { value: 0, label: "Trivago" },
            { value: 7, label: "7.0+" },
            { value: 7.5, label: "7.5+" },
            { value: 8, label: "8.0+" },
            { value: 8.5, label: "8.5+" },
            { value: 9, label: "9.0+" },
          ]}
          onChange={(v) => setFilter("minTrivago", v)}
        />

        <FilterPill
          label="TA"
          color="text-[#4ade80]"
          value={filters.minTA}
          options={[
            { value: 0, label: "TripAdvisor" },
            { value: 3.5, label: "3.5+" },
            { value: 4, label: "4.0+" },
            { value: 4.2, label: "4.2+" },
            { value: 4.5, label: "4.5+" },
          ]}
          onChange={(v) => setFilter("minTA", v)}
        />

        <div className="w-px h-4 bg-sand/10 mx-1" />

        <FilterPill
          label="✎"
          color="text-sand-dim opacity-75"
          value={filters.minEmployeeRating}
          options={[
            { value: 0, label: "Ocen prac." },
            { value: 1, label: "1+" },
            { value: 3, label: "3+" },
            { value: 5, label: "5+" },
            { value: 10, label: "10+" },
            { value: 20, label: "20+" },
          ]}
          onChange={(v) => setFilter("minEmployeeRating", v)}
        />
      </div>
    </div>
  );
}

function FilterPill({
  label,
  color,
  value,
  options,
  onChange,
}: {
  label: string;
  color: string;
  value: number;
  options: { value: number; label: string }[];
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-1">
      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${color}`}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border-none bg-transparent py-1 pr-4 text-sm font-semibold text-sand-bright outline-none cursor-pointer appearance-none bg-no-repeat bg-right"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
