# SmartWakacje

Scraper ofert z wakacje.pl z UI do przegladania i enrichmentem Google Maps ratings.

## Szybki start

```bash
# 1. Ustaw klucz Google Maps API
echo "GOOGLE_MAPS_API_KEY=twoj_klucz" > .env

# 2. Pobierz oferty z wakacje.pl
npm run scrape

# 3. Pobierz Google Maps ratingi (wymaga klucza API)
npm run fetch-ratings

# 4. Zmerguj oferty + ratingi → final JSON + CSV
npm run enrich

# 5. Uruchom UI
npm start
# → http://localhost:3000
```

## Wymagania

- Node.js 18+
- Klucz Google Places API (legacy Text Search) w `.env` — potrzebny do kroków 3 i 5

## Skrypty

| Komenda | Opis |
|---------|------|
| `npm run scrape` | Pobiera oferty z wakacje.pl → `data/offers_*.json` |
| `npm run fetch-ratings` | Pobiera Google Maps ratingi → `data/google-ratings-cache.json` |
| `npm run enrich` | Merguje oferty + ratingi → `data/final_*.json` + `data/final_*.csv` |
| `npm start` | Uruchamia UI na http://localhost:3000 |

## scrape — pobieranie ofert

```bash
# domyslne daty: 2026-06-19 → 2026-06-30
npm run scrape

# wlasne daty
node src/scrape.js 2026-07-01 2026-07-14
```

Tworzy 3 pliki w `data/`:

| Plik | Zawartosc |
|------|-----------|
| `data/raw_<od>_<do>.json` | Surowe dane z API |
| `data/offers_<od>_<do>.json` | Sparsowane oferty |
| `data/offers_<od>_<do>.csv` | Oferty jako CSV (bez Google danych) |

## fetch-ratings — Google Maps ratingi

Pobiera ratingi z Google Maps dla hoteli spelniajacych kryteria:
- `ratingValue >= 8.5` AND `price > 14 000 zl`

Uzywa cache (`data/google-ratings-cache.json`) — kolejne uruchomienia nie powielaja API calls. Batch: 5 rownoleglie, ~60-90s dla ~200 hoteli.

```bash
npm run fetch-ratings

# lub konkretny plik ofert
node src/fetch-gmaps-ratings.js data/offers_2026-06-19_2026-06-30.json
```

Google Places API (legacy Text Search): 5 000 zapytan/mies. za darmo.

## enrich — merge ofert z ratingami

Laczy `offers_*.json` z `google-ratings-cache.json` w jeden plik. Wszystkie oferty (nie tylko przefiltrowane) — brak ratingu = `null`.

```bash
npm run enrich

# lub konkretny plik
node src/enrich.js data/offers_2026-06-19_2026-06-30.json
```

Output:

| Plik | Zawartosc |
|------|-----------|
| `data/data.json` | Oferty wzbogacone o Google data |
| `data/data.csv` | To samo jako CSV (UTF-8 BOM) |

## UI (server.js)

Lokalny serwer z interfejsem do przegladania ofert.

- Filtrowanie po kraju, cenie, ratingu, gwiazdkach, wyzwywieniu
- Wyszukiwanie po nazwie hotelu / biurze podrozy
- Sortowanie po 2 kryteriach
- Paginacja (20/50/100 ofert na strone)
- Google Maps rating na karcie — klikalne, z linkiem do map
- Przycisk "G Pobierz ratingi" — fetch dla ofert na aktualnej stronie

## Pola w `final_*.json`

| Pole | Opis |
|------|------|
| `name` | Nazwa hotelu |
| `country` / `region` / `city` | Lokalizacja |
| `duration` | Dlugosc pobytu (dni) |
| `departureDate` / `returnDate` | Daty wylotu i powrotu |
| `ratingValue` | Ocena wakacje.pl (np. 8.8) |
| `ratingRecommends` | Liczba polecen |
| `price` / `pricePerPerson` | Cena calkowita / za osobe (PLN) |
| `category` | Gwiazdki hotelu (1-5) |
| `serviceDesc` | Typ wyzywienia |
| `tourOperator` | Biuro podrozy |
| `googleRating` | Rating Google Maps (null jesli brak) |
| `googleRatingsTotal` | Liczba opinii Google (null jesli brak) |
| `googleMapsUrl` | Link do Google Maps (null jesli brak) |
| `googleAddress` | Adres z Google (null jesli brak) |
| `googlePlaceId` | Place ID Google (null jesli brak) |

## Domyslna konfiguracja wyszukiwania

| Parametr | Wartosc |
|----------|---------|
| Osoby | 2 doroslych + 2 dzieci (ur. 2019-06-03 i 2021-01-25) |
| Wylot z | Katowice |
| Kraje | Tunezja, Turcja |
| Wyzywienie | All Inclusive |
| Filtr | Dla dzieci |

Zeby zmienic — edytuj sekcje `// Config` na gorze `src/scrape.js`.

## Struktura projektu

```
src/
  scrape.js              — scraper ofert z wakacje.pl
  fetch-gmaps-ratings.js — pobieranie Google Maps ratingow → cache
  enrich.js              — merge ofert + cache → final JSON + CSV
  server.js              — serwer HTTP + UI + Google proxy
index.html               — frontend
.env                     — klucz API (gitignored)
data/                    — output (gitignored)
  offers_*.json          — surowe oferty
  google-ratings-cache.json — cache ratingow Google
  data.json              — oferty wzbogacone o Google data (uzywa server)
  data.csv               — to samo jako CSV
docs/WakacjeAPI.md       — dokumentacja API wakacje.pl
```
