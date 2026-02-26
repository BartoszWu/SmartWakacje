# Workflows and Commands

## Daily Development

- Start full app: `bun run dev`
- Start backend only: `bun run dev:server`
- Start frontend only: `bun run dev:frontend`
- Build frontend bundle: `bun run build`

## Data Workflows

### Scrape

- Run scraper with current `config.ts`: `bun run scrape`
- Result: new snapshot in `data/snapshots/<timestamp>/`

### Enrich Ratings

- Latest snapshot: `bun run enrich`
- Specific snapshot: `bun run enrich <snapshot-id>`

### Generate Report

- Latest snapshot: `bun run report`
- Specific snapshot: `bun run report <snapshot-id>`

### Refresh Global Rating Caches

- Google Maps: `bun run fetch-gmaps`
- TripAdvisor: `bun run fetch-ta`
- Trivago: `bun run fetch-trivago`
- All providers: `bun run fetch-all`

## Type Safety

- Frontend typecheck (manual): `cd packages/frontend && bun x tsc --noEmit`
