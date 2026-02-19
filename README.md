# SmartWakacje

Scraper ofert z wakacje.pl. Pobiera wszystkie oferty dla zadanych dat i zapisuje do JSON.

## Wymagania

Node.js 18+

## Uzycie

```bash
# domyslne daty: 2026-06-19 → 2026-06-30
node scrape.js

# lub wlasne daty
node scrape.js 2026-07-01 2026-07-14
```

## Output

Skrypt tworzy 2 pliki w katalogu `data/`:

| Plik | Zawartosc |
|------|-----------|
| `data/raw_<od>_<do>.json` | Surowe dane z API (wszystkie pola) |
| `data/offers_<od>_<do>.json` | Sparsowane — tylko przydatne pola |

## Pola w `offers_*.json`

| Pole | Opis |
|------|------|
| `name` | Nazwa hotelu |
| `placeName` | Pelna lokalizacja (kraj / region / miasto) |
| `url` | Link do oferty na wakacje.pl |
| `country` | Kraj |
| `region` | Region |
| `city` | Miasto |
| `duration` | Dlugosc pobytu (dni) |
| `departureDate` | Data wylotu |
| `returnDate` | Data powrotu |
| `ratingValue` | Ocena (np. 8.8) |
| `ratingRecommends` | Liczba opinii |
| `ratingReservationCount` | Liczba rezerwacji |
| `price` | Cena calkowita (za caly pokoj, PLN) |
| `pricePerPerson` | Cena za osobe (PLN) |
| `priceOld` | Cena przed obnizka (jesli jest) |
| `priceDiscount` | Kwota znizki (jesli jest) |
| `category` | Gwiazdki hotelu (1-5) |
| `serviceDesc` | Typ wyzywienia ("All Inclusive", "Ultra All Inclusive" itp.) |
| `tourOperator` | Biuro podrozy |
| `employeeRatingCount` | Ile razy pracownicy wakacje.pl recenzowali hotel |
| `promoLastMinute` | Czy oferta last minute |
| `promoFirstMinute` | Czy oferta first minute |
| `photo` | URL zdjecia hotelu |

## Domyslna konfiguracja

| Parametr | Wartosc |
|----------|---------|
| Osoby | 2 doroslych + 2 dzieci (ur. 2019-06-03 i 2021-01-25) |
| Wylot z | Katowice |
| Kraje | Tunezja, Turcja |
| Wyzywienie | All Inclusive |
| Filtr | Dla dzieci |

Zeby zmienic — edytuj sekcje `// Config` na gorze `scrape.js`.
