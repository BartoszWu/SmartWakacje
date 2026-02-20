import { NextRequest } from 'next/server'
import { 
  TRIVAGO_CACHE_FILE, 
  loadCache, 
  saveCache, 
  updateTrivagoInJSON,
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

    const cache = loadCache(TRIVAGO_CACHE_FILE)
    if (!cache[hotelName]?.results?.[selectedIndex]) {
      return error('Hotel or index not in cache', 404)
    }

    cache[hotelName].selected = selectedIndex
    saveCache(TRIVAGO_CACHE_FILE, cache)

    const selected = cache[hotelName].results[selectedIndex]
    updateTrivagoInJSON(hotelName, selected)

    return json({ ok: true, selected })
  } catch (err) {
    return error(err.message, 500)
  }
}
