'use client'

import { useState } from 'react'
import { abbreviateCount } from '@/utils/formatters'

export function RatingPopover({ type, data, offer, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(data.selected)
  const [loading, setLoading] = useState(false)

  const results = data.results || []
  const selected = results[selectedIndex]

  const handleSelect = async (index) => {
    if (type === 'wak') return
    
    setLoading(true)
    try {
      const endpoint = type === 'gmaps' 
        ? '/api/google-rating/select' 
        : type === 'trv' 
          ? '/api/trivago-rating/select' 
          : '/api/ta-rating/select'
      
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelName: offer.name, selectedIndex: index }),
      })
      setSelectedIndex(index)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    gmaps: 'Google Maps',
    trv: 'Trivago',
    ta: 'TripAdvisor',
  }

  const colorClass = {
    gmaps: 'text-[#6aabf7]',
    trv: 'text-[#a78bfa]',
    ta: 'text-[#4ade80]',
  }[type]

  if (results.length === 0) {
    return (
      <div className="popover-animate absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 min-w-[200px] bg-bg-raised border border-sand/10 rounded shadow-2xl z-[300] overflow-hidden">
        <div className="p-3 text-xs text-sand-dim text-center">
          Nie znaleziono
        </div>
      </div>
    )
  }

  if (results.length === 1 || selectedIndex != null) {
    const r = selected || results[0]
    return (
      <div className="popover-animate absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 min-w-[220px] bg-bg-raised border border-sand/10 rounded shadow-2xl z-[300] overflow-hidden">
        <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-sand-dim border-b border-sand/5 flex items-center justify-between">
          <span>{titles[type]}</span>
          <span className={`text-base font-bold ${colorClass}`}>
            {r.rating?.toFixed(1) ?? '–'}
          </span>
        </div>
        <div className="p-2.5 flex flex-col gap-1">
          {type === 'trv' && r.aspects && (
            <>
              {Object.entries(r.aspects).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-[10px]">
                  <span className="text-sand-dim capitalize">{key}</span>
                  <span className="font-bold text-sand-bright">{val}</span>
                </div>
              ))}
            </>
          )}
          {r.numReviews != null && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-sand-dim">Opinie</span>
              <span className="font-bold text-sand-bright">{abbreviateCount(r.numReviews || r.reviewsCount || r.totalRatings)}</span>
            </div>
          )}
        </div>
        {r.taUrl || r.mapsUrl || r.trivago_url ? (
          <a 
            href={r.taUrl || r.mapsUrl || r.trivago_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-2.5 py-1.5 border-t border-sand/5 text-[10px] font-semibold text-sand-dim text-center hover:bg-white/5 hover:text-sand-bright transition-colors"
          >
            Otwórz źródło
          </a>
        ) : null}
      </div>
    )
  }

  return (
    <div className="popover-animate absolute bottom-full left-0 mb-1.5 min-w-[220px] max-w-[280px] bg-bg-raised border border-sand/10 rounded shadow-2xl z-[300] overflow-hidden">
      <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-sand-dim border-b border-sand/5">
        Wybierz wynik ({results.length})
      </div>
      <div className="max-h-[200px] overflow-y-auto">
        {results.map((r, i) => (
          <button
            type="button"
            key={i}
            onClick={() => handleSelect(i)}
            disabled={loading}
            className={`
              w-full flex items-center gap-2 px-2.5 py-2 text-left border-b border-sand/5 last:border-b-0
              transition-colors hover:bg-white/5
              ${loading ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            <span className={`text-sm font-bold ${colorClass} w-7 text-center shrink-0`}>
              {r.rating?.toFixed(1) ?? '–'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-sand-bright truncate">
                {r.name}
              </div>
              <div className="text-[10px] text-sand-dim truncate">
                {r.address || r.locationLabel}
              </div>
            </div>
            <span className="text-[10px] text-sand-dim shrink-0">
              {abbreviateCount(r.numReviews || r.reviewsCount || r.totalRatings || 0)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
