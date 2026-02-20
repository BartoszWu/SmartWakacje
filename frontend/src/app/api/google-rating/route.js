import { NextRequest } from 'next/server'
import { searchGoogle } from '@/lib/google'
import { 
  GOOGLE_CACHE_FILE, 
  loadCache, 
  saveCache, 
  updateOfferInJSON,
  json,
  error 
} from '@/lib/cache'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  const city = searchParams.get('city') || ''
  const country = searchParams.get('country') || ''

  if (!name) return error('Missing "name" param', 400)
  
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return error('Missing GOOGLE_MAPS_API_KEY in environment', 500)

  const cache = loadCache(GOOGLE_CACHE_FILE)

  if (cache[name]) {
    return json({ 
      results: cache[name].results, 
      selected: cache[name].selected ?? null, 
      fromCache: true 
    })
  }

  try {
    const results = await searchGoogle(name, city, country, apiKey)
    cache[name] = { 
      results, 
      selected: results.length === 1 ? 0 : null, 
      fetchedAt: new Date().toISOString() 
    }
    saveCache(GOOGLE_CACHE_FILE, cache)

    if (results.length === 1) {
      updateOfferInJSON(name, results[0])
    }

    return json({ results, selected: cache[name].selected, fromCache: false })
  } catch (err) {
    return error(err.message, 502)
  }
}
