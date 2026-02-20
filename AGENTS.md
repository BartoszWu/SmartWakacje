# SmartWakacje

Scraper ofert wakacyjnych z wakacje.pl. Pobiera oferty przez reverse-engineered API i zapisuje do JSON.

## Tech Stack

- **Runtime**: Bun
- **Frontend**: Vite + React 18 + TypeScript + Tailwind
- **Backend**: Bun server + tRPC
- **State**: Zustand
- **Typy**: Wspólne w `@smartwakacje/shared`

## Struktura projektu

```
smartwakacje/
├── package.json              # Workspace root + scripts
├── config.ts                 # Konfiguracja (scraper + fetch + report)
├── .env                      # API keys
│
├── packages/
│   ├── shared/               # Typy + utils
│   │   └── src/
│   │       ├── types.ts      # Offer, Filters, Ratings, etc.
│   │       └── utils.ts      # formatDate, normalizeName, etc.
│   │
│   ├── server/               # Bun + tRPC backend
│   │   └── src/
│   │       ├── index.ts      # Server entry
│   │       ├── trpc.ts       # tRPC setup
│   │       ├── routers/
│   │       │   └── offers.ts # tRPC router
│   │       └── services/
│   │           ├── cache.ts
│   │           ├── google.ts
│   │           ├── tripadvisor.ts
│   │           └── trivago.ts
│   │
│   └── frontend/             # Vite + React + Tailwind
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── trpc.ts
│           ├── store/
│           │   └── useStore.ts
│           └── components/
│
├── scripts/
│   └── src/
│       ├── scrape.ts         # Main scraper
│       ├── enrich.ts         # Merge offers with ratings
│       ├── report.ts         # Generate CSV report
│       └── fetch-ratings/
│           ├── google.ts
│           ├── tripadvisor.ts
│           └── trivago.ts
│
├── data/                     # Output (gitignored)
└── docs/                     # Dokumentacja API
```

## Komendy

```bash
# Development
bun run dev              # Start server + frontend
bun run dev:server       # Start tRPC server (port 3000)
bun run dev:frontend     # Start Vite dev server (port 5173)

# Build
bun run build            # Build frontend for production

# Scraping
bun run scrape           # Pobierz oferty z wakacje.pl
bun run enrich           # Merge offers with ratings cache
bun run report           # Generate filtered CSV report

# Ratings
bun run fetch-gmaps      # Batch Google Maps ratings
bun run fetch-ta         # Batch TripAdvisor ratings
bun run fetch-trivago    # Batch Trivago ratings
bun run fetch-all        # All three
```

## Konfiguracja

Wszystko w `config.ts`:

### Scraper
- `departureDateFrom` / `departureDateTo` — daty wyjazdu
- `airports` — ID lotnisk (Katowice: 2622)
- `countries` — ID krajów (Tunezja: 65, Turcja: 16)
- `service` — typ wyżywienia (1 = All Inclusive)
- `adults`, `children`, `childAges` — konfiguracja pokoi

### Fetch ratings
- `minRating` — min. wakacje.pl rating do pobierania
- `maxPrice` — max cena do pobierania
- `batchSize`, `batchDelayMs` — parametry batchowania

### Report
- `maxPrice`, `minGmaps`, `minTripAdvisor`, `minTrivago` — filtry

## API tRPC

| Endpoint | Opis |
|----------|------|
| `offers.list` | Zwraca wszystkie oferty |
| `offers.fetchGoogleRating` | Pobiera rating z Google Maps |
| `offers.selectGoogleRating` | Zaznacza wynik z wielu |
| `offers.fetchTARating` | Pobiera rating z TripAdvisor |
| `offers.selectTARating` | Zaznacza wynik z wielu |
| `offers.fetchTrivagoRating` | Pobiera rating z Trivago |

## Typy

Główne typy w `packages/shared/src/types.ts`:

```typescript
interface Offer {
  id: string;
  name: string;
  country: string;
  price: number;
  pricePerPerson: number;
  ratingValue: number;
  googleRating?: number;
  trivagoRating?: number;
  taRating?: number;
  // ...
}
```

## .env

```
GOOGLE_MAPS_API_KEY=xxx
TRIPADVISOR_API_KEY=xxx
```

## API wakacje.pl — kluczowe fakty

- Endpoint: `POST /v2/api/offers` — bez auth, bez cookies
- Request body: JSON array z obiektem `{ method: "search.tripsSearch", params: { ... } }`
- Response: `{ success: true, data: { count: N, offers: [...] } }`
- Paginacja: `params.query.pageNumber` (1-indexed), `params.limit` (max 50)
- Pokoje: `rooms: [{ adult: 2, kid: 2, ages: ["YYYYMMDD", ...] }]`
- Wymagane headery: `Content-Type`, `User-Agent` (browser), `Origin`, `Referer`

Szczegoly w `docs/WakacjeAPI.md`.

## Konwencje

- Język kodu: angielski
- Język komentarzy/docs: polski (README, AGENTS) lub angielski (kod, JSDoc)
- ESM (`"type": "module"`)
