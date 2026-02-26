# Functional Map

## End-to-End Flow

1. Collect offers from wakacje.pl (`scripts/src/scrape.ts` + `scripts/src/scraper-core.ts`)
2. Save a snapshot (`data/snapshots/<timestamp>/`)
3. Enrich offers with external ratings caches (`scripts/src/enrich.ts` + `data/cache/*`)
4. Browse/filter offers in frontend (`packages/frontend/src/*`)
5. Ask AI about current snapshot (`packages/server/src/chat.ts` + `packages/frontend/src/components/ChatPanel.tsx`)

## Package Responsibilities

### `packages/server`

- Serves tRPC API and chat endpoint (`packages/server/src/index.ts`)
- Provides snapshots CRUD and offers/rating procedures (`packages/server/src/routers/*`)
- Integrates rating services + cache logic (`packages/server/src/services/*`)
- Streams Gemini chat responses grounded in snapshot offers (`packages/server/src/chat.ts`)

### `packages/frontend`

- UI entry + view routing (`packages/frontend/src/App.tsx`)
- Home flow: configure scrape and pick snapshot (`HomePage.tsx`)
- Offers flow: filters, controls, cards, pagination (`FilterBar.tsx`, `Controls.tsx`, `OfferGrid.tsx`, `Pagination.tsx`)
- AI drawer for snapshot-aware recommendations (`ChatPanel.tsx`)
- Client state in Zustand, data fetching via tRPC + React Query

### `scripts`

- CLI scrape wrapper and reusable scrape core
- Ratings enrichment for snapshot offers
- CSV report generation with threshold filters (`scripts/src/report.ts`)
- Batch external ratings fetchers (`scripts/src/fetch-ratings/*`)

### `packages/shared`

- Shared domain types (`Offer`, `SnapshotMeta`, configs)
- Shared constants and utility helpers used by multiple packages

## Deep Dives

- Chat internals: [`docs/docs.md`](../docs.md)
- wakacje.pl request/response specifics: [`docs/WakacjeAPI.md`](../WakacjeAPI.md)
