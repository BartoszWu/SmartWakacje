import { useStore } from "../store/useStore";

export function Pagination() {
  const filteredOffers = useStore((s) => s.filteredOffers);
  const page = useStore((s) => s.page);
  const perPage = useStore((s) => s.perPage);
  const setPage = useStore((s) => s.setPage);
  const setPerPage = useStore((s) => s.setPerPage);

  const totalPages = Math.ceil(filteredOffers.length / perPage);
  if (totalPages <= 1) return null;

  const pages = buildPageNumbers(page, totalPages);

  const handlePage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => handlePage(page - 1)}
        disabled={page <= 1}
        className="min-w-9 h-9 rounded border border-sand/10 bg-transparent text-sand-dim text-sm font-semibold flex items-center justify-center hover:border-sand-dim hover:text-sand transition-all disabled:opacity-30 disabled:cursor-default"
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="text-sand-dim text-sm px-1">
            …
          </span>
        ) : (
          <button
            type="button"
            key={p}
            onClick={() => handlePage(p)}
            className={`min-w-9 h-9 rounded border text-sm font-semibold flex items-center justify-center transition-all ${
              p === page
                ? "bg-accent border-accent text-white"
                : "border-sand/10 bg-transparent text-sand-dim hover:border-sand-dim hover:text-sand"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => handlePage(page + 1)}
        disabled={page >= totalPages}
        className="min-w-9 h-9 rounded border border-sand/10 bg-transparent text-sand-dim text-sm font-semibold flex items-center justify-center hover:border-sand-dim hover:text-sand transition-all disabled:opacity-30 disabled:cursor-default"
      >
        ›
      </button>

      <div className="ml-4 flex items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-sand-dim">Na stronę</span>
        {[20, 50, 100].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setPerPage(n)}
            className={`px-2 py-1 rounded border text-xs font-semibold transition-all ${
              perPage === n
                ? "bg-accent border-accent text-white"
                : "border-sand/10 bg-transparent text-sand-dim hover:border-sand-dim hover:text-sand"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </nav>
  );
}

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
