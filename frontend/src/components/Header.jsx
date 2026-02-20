'use client'

import { useMemo } from 'react'
import { formatPrice } from '@/utils/formatters'

export function Header({ offers }) {
  const stats = useMemo(() => {
    const n = offers.length
    if (n === 0) return { count: 0, avgPrice: 0, avgRating: 0, minPrice: 0 }
    
    const avgPrice = Math.round(offers.reduce((s, o) => s + o.pricePerPerson, 0) / n)
    const avgRating = (offers.reduce((s, o) => s + (o.ratingValue || 0), 0) / n).toFixed(1)
    const minPrice = Math.min(...offers.map(o => o.pricePerPerson))
    
    return { count: n, avgPrice, avgRating, minPrice }
  }, [offers])

  return (
    <header className="sticky top-0 z-[100] bg-gradient-to-b from-bg via-bg/60 to-transparent pt-5 pb-3 px-8 backdrop-blur-xl">
      <div className="max-w-[1440px] mx-auto flex items-baseline justify-between flex-wrap gap-3">
        <div className="font-display text-3xl text-sand-bright tracking-tight whitespace-nowrap">
          Smart<span className="text-accent">Wakacje</span>
        </div>
        <div className="flex gap-6 text-xs font-medium uppercase tracking-wider text-sand-dim">
          <div>Oferty<span className="val text-sand-bright font-bold text-base ml-1">{stats.count}</span></div>
          <div>Sr. cena/os<span className="val text-sand-bright font-bold text-base ml-1">{formatPrice(stats.avgPrice)} zł</span></div>
          <div>Sr. ocena<span className="val text-sand-bright font-bold text-base ml-1">{stats.avgRating}</span></div>
          <div>Min cena/os<span className="val text-sand-bright font-bold text-base ml-1">{formatPrice(stats.minPrice)} zł</span></div>
        </div>
      </div>
    </header>
  )
}
