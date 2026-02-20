'use client'

export function Pagination({ currentPage, totalPages, perPage, onPageChange, onPerPageChange }) {
  if (totalPages <= 1) {
    return (
      <nav className="max-w-[1440px] mx-auto px-8 pb-12 flex items-center justify-center gap-2 flex-wrap">
        <PerPageSelector perPage={perPage} onChange={onPerPageChange} />
      </nav>
    )
  }

  const pages = buildPageNumbers(currentPage, totalPages)

  return (
    <nav className="max-w-[1440px] mx-auto px-8 pb-12 flex items-center justify-center gap-1.5 flex-wrap">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="min-w-[36px] h-9 px-2 rounded-sm border border-sand/10 bg-transparent text-sand-dim text-xs font-semibold cursor-pointer transition-colors hover:border-sand-dim hover:text-sand disabled:opacity-30 disabled:cursor-default"
      >
        ‹
      </button>

      {pages.map((p, i) => (
        p === '...' 
          ? <span key={`ellipsis-${i}`} className="text-sand-dim text-xs px-1">…</span>
          : <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-[36px] h-9 px-2 rounded-sm border text-xs font-semibold cursor-pointer transition-colors ${
                p === currentPage 
                  ? 'bg-accent border-accent text-white' 
                  : 'border-sand/10 bg-transparent text-sand-dim hover:border-sand-dim hover:text-sand'
              }`}
            >
              {p}
            </button>
      ))}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="min-w-[36px] h-9 px-2 rounded-sm border border-sand/10 bg-transparent text-sand-dim text-xs font-semibold cursor-pointer transition-colors hover:border-sand-dim hover:text-sand disabled:opacity-30 disabled:cursor-default"
      >
        ›
      </button>

      <PerPageSelector perPage={perPage} onChange={onPerPageChange} />
    </nav>
  )
}

function PerPageSelector({ perPage, onChange }) {
  return (
    <div className="ml-4 flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-sand-dim">Na stronę</span>
      {[20, 50, 100].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`px-2 py-1 rounded-sm text-[11px] font-semibold cursor-pointer transition-colors ${
            perPage === n 
              ? 'bg-accent border-accent text-white' 
              : 'border border-sand/10 bg-transparent text-sand-dim hover:border-sand-dim hover:text-sand'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  pages.push(1)
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}
