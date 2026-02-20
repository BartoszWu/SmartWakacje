import { NextRequest } from 'next/server'
import { fetchTaDetails } from '@/lib/tripadvisor'
import { 
  TA_CACHE_FILE, 
  loadCache, 
  saveCache, 
  updateTaInJSON,
  json,
  error 
} from '@/lib/cache'

export async function POST(request) {
  try {
    const body = await request.json()
    const { hotelName, selectedIndex } = body

    if (!hotelName || selectedIndex == null) {
      return error('Missing hotelName or selectedIndex', 400)
    }

    const cache = loadCache(TA_CACHE_FILE)
    if (!cache[hotelName]?.results?.[selectedIndex]) {
      return error('Hotel or index not in cache', 404)
    }

    const candidate = cache[hotelName].results[selectedIndex]

    if (candidate.rating == null && candidate.taUrl == null) {
      const apiKey = process.env.TRIPADVISOR_API_KEY
      if (!apiKey) return error('Missing TRIPADVISOR_API_KEY in environment', 500)
      const details = await fetchTaDetails(candidate.locationId, apiKey)
      candidate.rating = details.rating
      candidate.numReviews = details.numReviews
      candidate.taUrl = details.taUrl
    }

    cache[hotelName].selected = selectedIndex
    saveCache(TA_CACHE_FILE, cache)
    updateTaInJSON(hotelName, candidate)

    return json({ ok: true, selected: candidate })
  } catch (err) {
    return error(err.message, 500)
  }
}
