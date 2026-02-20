'use client'

import { useState } from 'react'
import { OfferCard } from './OfferCard'

export function Grid({ offers, page, perPage }) {
  const [loadingRatings, setLoadingRatings] = useState(new Set())

  const totalPages = Math.ceil(offers.length / perPage)
  const start = (page - 1) * perPage
  const pageOffers = offers.slice(start, start + perPage)

  if (offers.length === 0) {
    return (
      <div className="text-center py-24 px-8 font-display text-2xl text-sand-dim">
        Brak ofert pasujących do filtrów
      </div>
    )
  }

  return (
    <main className="max-w-[1440px] mx-auto px-8 pb-16 grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-5">
      {pageOffers.map((offer, i) => (
        <OfferCard 
          key={offer._uid ?? i} 
          offer={offer} 
          index={i}
        />
      ))}
    </main>
  )
}
