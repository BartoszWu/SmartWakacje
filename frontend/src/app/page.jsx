import { readFileSync } from 'node:fs'
import { OffersPage } from '@/components/OffersPage'
import { findLatestOffers } from '@/lib/cache'

async function getOffers() {
  const file = findLatestOffers()
  if (!file) return []
  
  try {
    const offers = JSON.parse(readFileSync(file, 'utf-8'))
    return offers.map((o, i) => ({ ...o, _uid: i }))
  } catch {
    return []
  }
}

export default async function Home() {
  const offers = await getOffers()
  
  return <OffersPage initialOffers={offers} />
}
