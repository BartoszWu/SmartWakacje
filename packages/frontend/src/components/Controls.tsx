import { useStore } from "../store/useStore";

export function Controls() {
  const countries = useStore((s) => s.countries);
  const filters = useStore((s) => s.filters);
  const sort = useStore((s) => s.sort);
  const setFilter = useStore((s) => s.setFilter);
  const setSort = useStore((s) => s.setSort);

  return (
    <div className="max-w-7xl mx-auto px-8 py-3 flex flex-wrap gap-2 items-center relative z-40">
      <button
        className={`px-4 py-2 rounded-full border text-xs font-semibold uppercase tracking-wide transition-all ${
          filters.country === "all"
            ? "bg-accent border-accent text-white"
            : "border-sand/15 text-sand-dim hover:border-sand-dim hover:text-sand"
        }`}
        onClick={() => setFilter("country", "all")}
      >
        Wszystkie
      </button>

      {countries.map((c) => (
        <button
          key={c}
          className={`px-4 py-2 rounded-full border text-xs font-semibold uppercase tracking-wide transition-all ${
            filters.country === c
              ? "bg-accent border-accent text-white"
              : "border-sand/15 text-sand-dim hover:border-sand-dim hover:text-sand"
          }`}
          onClick={() => setFilter("country", c)}
        >
          {c}
        </button>
      ))}

      <div className="w-px h-6 bg-sand/10 mx-1" />

      <div className="relative flex-1 min-w-[180px] max-w-[320px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 stroke-sand-dim"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Szukaj hotelu..."
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          className="w-full py-2 pl-9 pr-4 rounded-full border border-sand/10 bg-white/5 text-sand-bright text-sm outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="w-px h-6 bg-sand/10 mx-1" />

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-sand-dim">Sortuj</span>
        <select
          value={sort.primary}
          onChange={(e) => setSort({ primary: e.target.value as typeof sort.primary })}
          className="py-2 px-3 rounded border border-sand/10 bg-white/5 text-sand-bright text-sm font-medium outline-none cursor-pointer focus:border-accent transition-colors appearance-none bg-no-repeat bg-right pr-6"
        >
          <option value="ratingValue">Wakacje.pl</option>
          <option value="googleRating">GMaps</option>
          <option value="trivagoRating">Trivago</option>
          <option value="taRating">TripAdvisor</option>
          <option value="pricePerPerson">Cena / os</option>
          <option value="price">Cena total</option>
          <option value="category">Gwiazdki</option>
        </select>
        <button
          className={`w-8 h-8 rounded border border-sand/10 flex items-center justify-center transition-all ${
            sort.primaryDir === "desc" ? "scale-y-[-1]" : ""
          }`}
          onClick={() => setSort({ primaryDir: sort.primaryDir === "desc" ? "asc" : "desc" })}
        >
          ▲
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-sand-dim">potem</span>
        <select
          value={sort.secondary}
          onChange={(e) => setSort({ secondary: e.target.value as typeof sort.secondary })}
          className="py-2 px-3 rounded border border-sand/10 bg-white/5 text-sand-bright text-sm font-medium outline-none cursor-pointer focus:border-accent transition-colors appearance-none bg-no-repeat bg-right pr-6"
        >
          <option value="pricePerPerson">Cena / os</option>
          <option value="ratingValue">Wakacje.pl</option>
          <option value="googleRating">GMaps</option>
          <option value="trivagoRating">Trivago</option>
          <option value="taRating">TripAdvisor</option>
        </select>
        <button
          className={`w-8 h-8 rounded border border-sand/10 flex items-center justify-center transition-all ${
            sort.secondaryDir === "desc" ? "scale-y-[-1]" : ""
          }`}
          onClick={() => setSort({ secondaryDir: sort.secondaryDir === "desc" ? "asc" : "desc" })}
        >
          ▲
        </button>
      </div>
    </div>
  );
}
