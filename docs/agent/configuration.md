# Configuration and Secrets

## Single Source of Tunable Runtime Settings

- Edit `config.ts` for all user-tunable runtime behavior.
- Keep scraper filters, ratings fetch thresholds, and report thresholds in that file.

## `config.ts` Sections

### `scraperConfig`

- Date window (`departureDateFrom`, `departureDateTo`)
- Departure airports (`airports`)
- Destination countries (`countries`)
- Board type (`service`)
- Travelers (`adults`, `children`, `childAges`)
- Crawl behavior (`pageSize`, `delayBetweenPages`)

### `fetchConfig`

- Base selection thresholds (`minRating`, `maxPrice`)
- Batch controls (`batchSize`, `batchDelayMs`)
- Provider-specific overrides (`googleMaps`, `tripAdvisor`, `trivago`)

### `reportConfig`

- CSV/report thresholds (`maxPrice`, `minGmaps`, `minTripAdvisor`, `minTrivago`)

## Environment Variables (`.env`)

- `GOOGLE_MAPS_API_KEY`
- `TRIPADVISOR_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
