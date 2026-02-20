import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd() + '/..'
export const DATA_DIR = join(ROOT, 'data')
export const GOOGLE_CACHE_FILE = join(DATA_DIR, 'google-ratings-cache.json')
export const TA_CACHE_FILE = join(DATA_DIR, 'ta-ratings-cache.json')
export const TRIVAGO_CACHE_FILE = join(DATA_DIR, 'trivago-ratings-cache.json')
export const DATA_FILE = join(DATA_DIR, 'data.json')

export const COUNTRY_EN = {
  Tunezja: 'Tunisia',
  Turcja: 'Turkey',
  Egipt: 'Egypt',
  Grecja: 'Greece',
  Hiszpania: 'Spain',
  Chorwacja: 'Croatia',
  'Bułgaria': 'Bulgaria',
  Cypr: 'Cyprus',
  Maroko: 'Morocco',
  Portugalia: 'Portugal',
  'Włochy': 'Italy',
  'Czarnogóra': 'Montenegro',
  Albania: 'Albania',
  Malta: 'Malta',
}

export function findLatestOffers() {
  if (existsSync(DATA_FILE)) return DATA_FILE
  if (!existsSync(DATA_DIR)) return null
  const files = readdirSync(DATA_DIR)
    .filter(f => f.startsWith('offers_') && f.endsWith('.json'))
    .map(f => ({ name: f, mtime: statSync(join(DATA_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  return files.length ? join(DATA_DIR, files[0].name) : null
}

export function loadCache(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return {}
  }
}

export function saveCache(file, cache) {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(file, JSON.stringify(cache, null, 2))
}

export function normalizeName(name) {
  return name.replace(/\s*\(.*?\)\s*/g, ' ').trim()
}

export function updateOfferInJSON(hotelName, result) {
  const file = findLatestOffers()
  if (!file) return

  const offers = JSON.parse(readFileSync(file, 'utf-8'))
  let changed = false

  for (const o of offers) {
    if (o.name === hotelName) {
      o.googleRating = result.rating
      o.googleRatingsTotal = result.totalRatings
      o.googleMapsUrl = result.mapsUrl
      changed = true
    }
  }

  if (changed) {
    writeFileSync(file, JSON.stringify(offers, null, 2))
  }
}

export function updateTaInJSON(hotelName, result) {
  const file = findLatestOffers()
  if (!file) return
  const offers = JSON.parse(readFileSync(file, 'utf-8'))
  let changed = false
  for (const o of offers) {
    if (o.name === hotelName) {
      o.taRating = result.rating
      o.taReviewCount = result.numReviews
      o.taUrl = result.taUrl
      o.taLocationId = result.locationId
      changed = true
    }
  }
  if (changed) writeFileSync(file, JSON.stringify(offers, null, 2))
}

export function updateTrivagoInJSON(hotelName, result) {
  const file = findLatestOffers()
  if (!file) return
  const offers = JSON.parse(readFileSync(file, 'utf-8'))
  let changed = false
  for (const o of offers) {
    if (o.name === hotelName) {
      o.trivagoRating = result.rating
      o.trivagoReviewsCount = result.reviewsCount
      o.trivagoUrl = result.trivago_url
      o.trivagoNsid = result.nsid
      const asp = result.aspects ?? {}
      o.trivagoAspectCleanliness = asp.cleanliness ?? null
      o.trivagoAspectLocation = asp.location ?? null
      o.trivagoAspectComfort = asp.comfort ?? null
      o.trivagoAspectValueForMoney = asp.valueForMoney ?? null
      o.trivagoAspectService = asp.service ?? null
      o.trivagoAspectFood = asp.food ?? null
      o.trivagoAspectRooms = asp.rooms ?? null
      changed = true
    }
  }
  if (changed) writeFileSync(file, JSON.stringify(offers, null, 2))
}

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}

export function error(message, status = 500) {
  return json({ error: message }, status)
}
