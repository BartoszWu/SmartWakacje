'use client'

import { useState, useEffect, useRef } from 'react'
import { abbreviateCount } from '@/utils/formatters'
import { RatingPopover } from './RatingPopover'

function RatingSegment({ type, offer, onFetch }) {
  const [showPopover, setShowPopover] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const ref = useRef(null)

  const config = {
    wak: { label: 'W', color: 'text-gold', ratingKey: 'ratingValue', countKey: 'ratingReservationCount' },
    gmaps: { label: 'G', color: 'text-[#6aabf7]', ratingKey: 'googleRating', countKey: 'googleRatingsTotal' },
    trv: { label: 'tv', color: 'text-[#a78bfa]', ratingKey: 'trivagoRating', countKey: 'trivagoReviewsCount' },
    ta: { label: 'TA', color: 'text-[#4ade80]', ratingKey: 'taRating', countKey: 'taReviewCount' },
  }[type]

  const rating = offer[config.ratingKey]
  const count = offer[config.countKey]

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleClick = async () => {
    if (type === 'wak') return
    
    if (data) {
      setShowPopover(!showPopover)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/${type === 'gmaps' ? 'google-rating' : type === 'trv' ? 'trivago-rating' : 'ta-rating'}?name=${encodeURIComponent(offer.name)}&city=${encodeURIComponent(offer.city)}&country=${encodeURIComponent(offer.country)}`)
      const json = await res.json()
      setData(json)
      setShowPopover(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isLoading = loading
  const isNotFound = !loading && data && data.results?.length === 0

  return (
    <button
      type="button"
      ref={ref}
      onClick={handleClick}
      disabled={type === 'wak' || isNotFound}
      className={`
        relative flex-1 flex items-center justify-center gap-1 px-1 py-1.5
        border-r border-sand/[0.06] last:border-r-0
        font-body text-sm font-bold transition-colors
        ${isLoading ? 'rating-pulse cursor-default' : ''}
        ${isNotFound ? 'opacity-30 cursor-default' : 'hover:bg-white/5'}
        ${type !== 'wak' ? 'cursor-pointer' : ''}
      `}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-65">{config.label}</span>
      <span className={`${config.color}`}>
        {rating != null ? (type === 'wak' || type === 'trv' ? rating.toFixed(1) : rating.toFixed(1)) : '–'}
      </span>
      {count != null && (
        <span className="text-[10px] font-normal opacity-55">{abbreviateCount(count)}</span>
      )}

      {showPopover && data && (
        <RatingPopover 
          type={type} 
          data={data} 
          offer={offer}
          onClose={() => setShowPopover(false)}
        />
      )}
    </button>
  )
}

export function RatingBar({ offer }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-[3] flex items-stretch bg-[#0a0a0c]/70 backdrop-blur border-t border-sand/[0.07]">
      <RatingSegment type="wak" offer={offer} />
      <RatingSegment type="gmaps" offer={offer} />
      <RatingSegment type="trv" offer={offer} />
      <RatingSegment type="ta" offer={offer} />
    </div>
  )
}
