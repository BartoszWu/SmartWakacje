# Data Model and API Surface

## Snapshots

- Every scrape creates `data/snapshots/<timestamp>/`
- Typical files per snapshot:
  - `meta.json` (snapshot metadata + filters)
  - `offers.json` (offers array, enriched in place)
  - `raw.json` (raw API payload)
  - `offers.csv` (report/export)

## Rating Cache Scope

- Provider caches are global across snapshots (`data/cache/*`)
- Once a hotel rating is resolved, later snapshots reuse it

## Key Shared Types

- `Offer`: core offer payload used by backend, scripts, and frontend
- `SnapshotMeta`: snapshot identity, creation time, filters, countries, count
- Source: `packages/shared/src/types.ts`

## tRPC Procedures (server API)

- `snapshots.list` / `snapshots.scrape` / `snapshots.delete`
- `offers.list`
- `offers.fetchGoogleRating` / `offers.selectGoogleRating`
- `offers.fetchTARating` / `offers.selectTARating`
- `offers.fetchTrivagoRating`

## wakacje.pl Upstream API

- Endpoint: `POST /v2/api/offers`
- Pagination via `params.query.pageNumber` and `params.limit` (max 50)
- Required browser-like headers (`Content-Type`, `User-Agent`, `Origin`, `Referer`)
- Full protocol details: [`docs/WakacjeAPI.md`](../WakacjeAPI.md)
