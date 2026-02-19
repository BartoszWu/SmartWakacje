# SmartWakacje

Scraper ofert wakacyjnych z wakacje.pl. Pobiera oferty przez reverse-engineered API i zapisuje do JSON.

## Struktura projektu

```
scrape.js          — glowny skrypt, jedyny plik do odpalenia
src/wakacje-api.js — biblioteka API (nieuzywana przez scrape.js, legacy)
src/scrape.js      — stary entry point (nieuzywany, legacy)
docs/WakacjeAPI.md — dokumentacja reverse-engineered API wakacje.pl
data/              — output scraperа (gitignored)
```

## Jak dziala scraper

`scrape.js` wysyla POST do `https://www.wakacje.pl/v2/api/offers` z payloadem opisanym w `docs/WakacjeAPI.md`. Paginuje po 50 ofert na strone z 1s opoznieniem miedzy requestami. Uzywa `node:https` zamiast `fetch` bo serwer zwraca HTTP 449 na Node fetch (bot detection po TLS fingerprint).

Produkuje 2 pliki:
- `data/raw_<od>_<do>.json` — surowa odpowiedz API
- `data/offers_<od>_<do>.json` — sparsowane pola (name, url, price, rating, etc.)

## Konfiguracja wyszukiwania

Parametry wyszukiwania sa w sekcji `// Config` na gorze `scrape.js` (linie 14-25). Domyslne wartosci:
- Daty: 2026-06-19 do 2026-06-30 (nadpisywalne przez CLI args)
- Osoby: 2 doroslych + 2 dzieci (ur. 20190603, 20210125)
- Wylot: Katowice (ID 2622)
- Kraje: Tunezja (65) + Turcja (16)
- Wyzywienie: All Inclusive (service: 1)
- Filtr: dla dzieci (attribute: 29)

Pelna lista znanych ID (kraje, lotniska, sortowanie, typy wyzywienia) jest w `docs/WakacjeAPI.md`.

## API wakacje.pl — kluczowe fakty

- Endpoint: `POST /v2/api/offers` — bez auth, bez cookies
- Request body: JSON array z obiektem `{ method: "search.tripsSearch", params: { ... } }`
- Response: `{ success: true, data: { count: N, offers: [...] } }`
- Paginacja: `params.query.pageNumber` (1-indexed), `params.limit` (max 50)
- Pokoje: `rooms: [{ adult: 2, kid: 2, ages: ["YYYYMMDD", ...] }]`
- Wymagane headery: `Content-Type`, `User-Agent` (browser), `Origin`, `Referer`
- WAZNE: uzyj `node:https`, nie `fetch` — serwer blokuje Node fetch (HTTP 449)

Szczegoly w `docs/WakacjeAPI.md`.

## Konwencje

- Jezyk kodu: angielski
- Jezyk komentarzy/docs: polski (README, AGENTS) lub angielski (kod, JSDoc)
- Brak zewnetrznych zaleznosci — tylko Node stdlib (`node:https`, `node:fs`)
- ESM (`"type": "module"` w package.json)
