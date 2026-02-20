import { readFileSync } from 'node:fs'
import { NextResponse } from 'next/server'
import { findLatestOffers, json, error } from '@/lib/cache'

export async function GET() {
  const file = findLatestOffers()
  if (!file) {
    return error('No offers_*.json found in data/', 404)
  }
  
  const offers = JSON.parse(readFileSync(file, 'utf-8'))
  return json(offers)
}
