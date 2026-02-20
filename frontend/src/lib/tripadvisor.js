import https from 'node:https'
import { normalizeName, COUNTRY_EN } from './cache'

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

export async function fetchTaDetails(locationId, apiKey) {
  const url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?key=${apiKey}&language=en`
  const data = await httpGet(url)
  return {
    rating: data.rating ? parseFloat(data.rating) : null,
    numReviews: data.num_reviews ? parseInt(data.num_reviews) : null,
    taUrl: data.web_url || null,
  }
}

export async function searchTa(name, city, country, apiKey) {
  const cleanName = normalizeName(name)
  const countryEn = COUNTRY_EN[country] || country || ''
  const query = `${cleanName} ${city || ''} ${countryEn}`.trim()

  const url = new URL('https://api.content.tripadvisor.com/api/v1/location/search')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('searchQuery', query)
  url.searchParams.set('category', 'hotels')
  url.searchParams.set('language', 'en')

  const searchData = await httpGet(url.toString())
  const candidates = searchData.data?.slice(0, 5) || []
  if (!candidates.length) return []

  const results = []
  for (const loc of candidates) {
    const details = await fetchTaDetails(loc.location_id, apiKey)
    results.push({
      locationId: loc.location_id,
      name: loc.name || '',
      address: [loc.address_obj?.street1, loc.address_obj?.city, loc.address_obj?.country]
        .filter(Boolean).join(', '),
      rating: details.rating,
      numReviews: details.numReviews,
      taUrl: details.taUrl,
    })
  }
  return results
}
