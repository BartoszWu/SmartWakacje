'use client'

import { useMemo } from 'react'
import { formatDate, formatPrice, getRatingClass } from '@/utils/formatters'
import { RatingBar } from './RatingBar'

function Stars({ count }) {
  return (
    <span className="inline-flex gap-0.5 ml-1.5 align-middle -mt-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg 
          key={i}
          className={`w-3 h-3 ${i < count ? 'fill-gold' : 'fill-sand/20'}`}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/>
        </svg>
      ))}
    </span>
  )
}

function MetaChip({ icon, value, label }) {
  const icons = {
    thumb: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z"/>
      </svg>
    ),
    calendar: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    briefcase: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
    clock: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  }

  if (!value && value !== 0) return null

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm bg-sand/5 text-[11px] font-semibold text-sand-dim">
      {icons[icon]}
      <span className="text-sand-bright">{value}</span>
      <span>{label}</span>
    </span>
  )
}

export function OfferCard({ offer, index }) {
  const delay = Math.min(index * 40, 600)
  const photoURL = offer.photo || `https://placehold.co/570x428/1e1e22/a89b88?text=${encodeURIComponent(offer.name.slice(0, 12))}`

  return (
    <article 
      className="card-animate bg-bg-card rounded border border-sand/[0.06] overflow-hidden cursor-default transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-sand/10"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative w-full aspect-video bg-bg-raised overflow-hidden">
        <img 
          src={photoURL} 
          alt={offer.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.04]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-transparent pointer-events-none" />
        
        <div className="absolute top-3 left-3 flex gap-1.5 z-10">
          {offer.promoFirstMinute && (
            <span className="px-2 py-1 rounded-full bg-blue text-white text-[10px] font-bold uppercase tracking-wide">
              First Minute
            </span>
          )}
          {offer.promoLastMinute && (
            <span className="px-2 py-1 rounded-full bg-red text-white text-[10px] font-bold uppercase tracking-wide">
              Last Minute
            </span>
          )}
          {offer.serviceDesc && (
            <span className="px-2 py-1 rounded-full bg-black/50 text-sand-bright text-[10px] font-bold uppercase tracking-wide backdrop-blur border border-white/10">
              {offer.serviceDesc}
            </span>
          )}
        </div>

        <RatingBar offer={offer} />

        <div className="absolute bottom-2 left-3 right-3 z-10">
          <h3 className="font-display text-xl text-white leading-tight drop-shadow-lg">
            {offer.name}
            <Stars count={offer.category || 0} />
          </h3>
          <div className="text-[11px] text-white/65 mt-0.5 font-medium">
            {offer.country} / {offer.region} / {offer.city}
          </div>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          <MetaChip icon="thumb" value={offer.ratingRecommends} label="polecen" />
          <MetaChip icon="calendar" value={offer.ratingReservationCount} label="rezerwacji" />
          <MetaChip icon="briefcase" value={offer.employeeRatingCount} label="ocen prac." />
          <MetaChip icon="clock" value={offer.duration} label="dni" />
        </div>

        <div className="flex items-baseline justify-between pt-2 border-t border-sand/5">
          <div>
            <span className="font-display text-2xl text-sand-bright leading-none">
              {formatPrice(offer.price)}
              <small className="font-body text-xs font-normal text-sand-dim ml-0.5">zł</small>
            </span>
            {offer.priceOld && (
              <span className="text-xs text-sand-dim line-through ml-2">
                {formatPrice(offer.priceOld)} zł
              </span>
            )}
            {offer.priceDiscount && (
              <span className="text-[10px] font-bold text-green ml-1.5">
                -{offer.priceDiscount}%
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-accent">
            {formatPrice(offer.pricePerPerson)} zł / os
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-sand-dim truncate">
            {offer.tourOperator}
          </span>
          <span className="text-[10px] font-semibold text-sand-dim bg-sand/5 px-2 py-1 rounded-sm">
            {formatDate(offer.departureDate)} - {formatDate(offer.returnDate)}
          </span>
          <a 
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-wide transition-all hover:bg-accent-glow hover:scale-[1.04]"
          >
            Zobacz
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M7 17L17 7M17 7H7M17 7v10"/>
            </svg>
          </a>
        </div>
      </div>
    </article>
  )
}
