import https from 'node:https'
import { normalizeName, COUNTRY_EN } from './cache'

export async function searchGoogle(name, city, country, apiKey) {
  const cleanName = normalizeName(name)
  const countryEn = COUNTRY_EN[country] || country || ''
  const query = `${cleanName} hotel ${city || ''} ${countryEn}`.trim()

  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', query)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('type', 'lodging')
  url.searchParams.set('language', 'en')

  const data = await httpGet(url.toString())

  if (data.status === 'OK' && data.results?.length > 0) {
    return data.results.slice(0, 5).map(r => ({
      name: r.name || '',
      rating: r.rating || 0,
      totalRatings: r.user_ratings_total || 0,
      address: r.formatted_address || '',
      placeId: r.place_id || '',
      mapsUrl: r.place_id
        ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}`
        : null,
    }))
  }

  return []
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString()
        if (res.statusCode !== 200)
          return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`))
        resolve(JSON.parse(raw))
      })
    }).on('error', reject)
  })
}
