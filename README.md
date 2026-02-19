# SmartWakacje

Scraper ofert z wakacje.pl z UI do przegladania i enrichmentem Google Maps ratings.

## Wymagania

Node.js 18+

## Szybki start

```bash
# 1. Ustaw klucz Google Maps API
echo "GOOGLE_MAPS_API_KEY=twoj_klucz" > .env

# 2. Pobierz oferty
node scrape.js

# 3. Wzbogac o Google ratings (opcjonalnie)
npm run enrich

# 4. Uruchom UI
npm start
# → http://localhost:3000
```

## Skrypty

| Komenda | Opis |
|---------|------|
| `node scrape.js [od] [do]` | Pobiera oferty z wakacje.pl |
| `npm run enrich` | Wzbogaca oferty o Google Maps ratings |
| `npm start` | Uruchamia UI na http://localhost:3000 |

## scrape.js — pobieranie ofert

```bash
# domyslne daty: 2026-06-19 → 2026-06-30
node scrape.js

# wlasne daty
node scrape.js 2026-07-01 2026-07-14
```

Tworzy 2 pliki w `data/`:

| Plik | Zawartosc |
|------|-----------|
| `data/raw_<od>_<do>.json` | Surowe dane z API |
| `data/offers_<od>_<do>.json` | Sparsowane pola |

## enrich-ratings.js — Google Maps ratings

Wzbogaca `offers_*.json` o ratingi z Google Maps dla hoteli spelniajacych kryteria:
- `ratingValue >= 8.5`
- `price > 14 000 zl`

**Uzywa cache** (`data/google-ratings-cache.json`) — kolejne uruchomienia nie powielaja API calls. Wysyla 5 zapytan rownoleglie — ok. 60-90s dla ~200 hoteli.

```bash
npm run enrich

# lub konkretny plik
node enrich-ratings.js data/offers_2026-06-19_2026-06-30.json
```

Wymaga klucza Google Places API (legacy Text Search) w `.env`:
```
GOOGLE_MAPS_API_KEY=AIza...
```

Google daje $200/mies. darmowego kredytu. Legacy Text Search: 5 000 zapytan/mies. za darmo, potem $32/1000.

## UI (server.js)

Lokalny serwer z interfejsem do przegladania ofert.

**Funkcje:**
- Filtrowanie po kraju, cenie, ratingu, gwiazdkach, wyzwywieniu
- Wyszukiwanie po nazwie hotelu / biurze podrozy
- Sortowanie po 2 kryteriach
- Paginacja (20/50/100 ofert na strone)
- Google Maps rating na karcie hotelu — klikalne, z linkiem do map
- Przycisk "G Pobierz ratingi" — fetchuje Google rating dla wszystkich ofert na aktualnej stronie
- Cache — raz pobrany rating nie odpytuje API ponownie

## Pola w `offers_*.json`

| Pole | Opis |
|------|------|
| `name` | Nazwa hotelu |
| `placeName` | Pelna lokalizacja |
| `url` | Link do oferty na wakacje.pl |
| `country` | Kraj |
| `region` | Region |
| `city` | Miasto |
| `duration` | Dlugosc pobytu (dni) |
| `departureDate` | Data wylotu |
| `returnDate` | Data powrotu |
| `ratingValue` | Ocena wakacje.pl (np. 8.8) |
| `ratingRecommends` | Liczba polecen |
| `ratingReservationCount` | Liczba rezerwacji |
| `price` | Cena calkowita (PLN) |
| `pricePerPerson` | Cena za osobe (PLN) |
| `priceOld` | Cena przed obnizka |
| `priceDiscount` | Procent znizki |
| `category` | Gwiazdki hotelu (1-5) |
| `serviceDesc` | Typ wyzywienia |
| `tourOperator` | Biuro podrozy |
| `employeeRatingCount` | Oceny pracownikow wakacje.pl |
| `promoLastMinute` | Oferta last minute |
| `promoFirstMinute` | Oferta first minute |
| `photo` | URL zdjecia |
| `googleRating` | Rating Google Maps (po enrich) |
| `googleRatingsTotal` | Liczba opinii Google (po enrich) |
| `googleMapsUrl` | Link do Google Maps (po enrich) |

## Domyslna konfiguracja wyszukiwania

| Parametr | Wartosc |
|----------|---------|
| Osoby | 2 doroslych + 2 dzieci (ur. 2019-06-03 i 2021-01-25) |
| Wylot z | Katowice |
| Kraje | Tunezja, Turcja |
| Wyzywienie | All Inclusive |
| Filtr | Dla dzieci |

Zeby zmienic — edytuj sekcje `// Config` na gorze `scrape.js`.

## Pliki

```
scrape.js                    — scraper ofert
enrich-ratings.js            — enrichment Google Maps ratings
server.js                    — serwer UI
index.html                   — frontend
.env                         — klucz API (gitignored)
data/offers_*.json           — oferty (gitignored)
data/google-ratings-cache.json — cache ratingow (gitignored)
docs/WakacjeAPI.md           — dokumentacja API wakacje.pl
```
