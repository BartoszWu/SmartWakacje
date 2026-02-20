import { NextRequest } from 'next/server'
import { searchTrivagoHotel, fetchTrivagoRatingsForNsid } from '@/lib/trivago'
import { 
  TRIVAGO_CACHE_FILE, 
  loadCache, 
  saveCache, 
  updateTrivagoInJSON,
  json,
  error 
} from '@/lib/cache'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')

  if (!name) return error('Missing "name" param', 400)

  const cache = loadCache(TRIVAGO_CACHE_FILE)

  if (cache[name]) {
    return json({ 
      results: cache[name].results, 
      selected: cache[name].selected ?? null, 
      fromCache: true 
    })
  }

  try {
    const concept = await searchTrivagoHotel(name)
    if (!concept) {
      cache[name] = { results: [], selected: null, fetchedAt: new Date().toISOString() }
      saveCache(TRIVAGO_CACHE_FILE, cache)
      return json({ results: [], selected: null, fromCache: false })
    }

    const ratings = await fetchTrivagoRatingsForNsid(concept.nsid)
    const result = {
      nsid: concept.nsid,
      name: concept.name,
      locationLabel: concept.locationLabel,
      rating: ratings.rating,
      reviewsCount: ratings.reviewsCount,
      trivago_url: ratings.trivago_url,
      aspects: ratings.aspects,
    }

    cache[name] = { results: [result], selected: 0, fetchedAt: new Date().toISOString() }
    saveCache(TRIVAGO_CACHE_FILE, cache)
    updateTrivagoInJSON(name, result)

    return json({ results: [result], selected: 0, fromCache: false })
  } catch (err) {
    return error(err.message, 502)
  }
}
