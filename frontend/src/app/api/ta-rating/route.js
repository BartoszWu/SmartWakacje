import { NextRequest } from 'next/server'
import { searchTa, fetchTaDetails } from '@/lib/tripadvisor'
import { 
  TA_CACHE_FILE, 
  loadCache, 
  saveCache, 
  updateTaInJSON,
  json,
  error 
} from '@/lib/cache'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  const city = searchParams.get('city') || ''
  const country = searchParams.get('country') || ''

  if (!name) return error('Missing "name" param', 400)
  
  const apiKey = process.env.TRIPADVISOR_API_KEY
  if (!apiKey) return error('Missing TRIPADVISOR_API_KEY in environment', 500)

  const cache = loadCache(TA_CACHE_FILE)

  if (cache[name]) {
    return json({ 
      results: cache[name].results, 
      selected: cache[name].selected ?? null, 
      fromCache: true 
    })
  }

  try {
    const results = await searchTa(name, city, country, apiKey)
    const selected = results.length === 1 ? 0 : null
    cache[name] = { results, selected, fetchedAt: new Date().toISOString() }
    saveCache(TA_CACHE_FILE, cache)

    if (results.length === 1) updateTaInJSON(name, results[0])

    return json({ results, selected, fromCache: false })
  } catch (err) {
    return error(err.message, 502)
  }
}
