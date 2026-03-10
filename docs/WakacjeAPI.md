# wakacje.pl API — Reverse Engineering Findings

## Endpoint

```
POST https://www.wakacje.pl/v2/api/offers
```

No auth required. Standard browser headers suffice.

## Request Format

Body is a **JSON array** with a single object:

```json
[{
  "method": "search.tripsSearch",
  "params": {
    "brand": "WAK",
    "limit": 50,
    "priceHistory": 1,
    "imageSizes": ["570,428"],
    "flatArray": true,
    "multiSearch": true,
    "withHotelRate": 1,
    "withPromoOffer": 0,
    "recommendationVersion": "noTUI",
    "imageLimit": 10,
    "withPromotionsInfo": false,
    "type": "tours",
    "firstMinuteTui": false,
    "countryId": ["65", "16"],
    "regionId": [],
    "cityId": [],
    "hotelId": [],
    "roundTripId": [],
    "cruiseId": [],
    "searchType": "wczasy",
    "offersAttributes": [],
    "alternative": {
      "countryId": [],
      "regionId": [],
      "cityId": []
    },
    "qsVersion": "cx_v2_auction",
    "query": { ... },
    "durationMin": "7"
  }
}]
```

### `params.query` object (the actual search filters)

```json
{
  "campTypes": [],
  "qsVersion": "cx_v2_auction",
  "qsVersionLast": 0,
  "tab": false,
  "candy": false,
  "pok": null,
  "flush": false,
  "tourOpAndCode": null,
  "obj_type": null,
  "catalog": null,
  "roomType": null,
  "test": null,
  "year": null,
  "month": null,
  "rangeDate": null,
  "withoutLast": 0,
  "category": false,
  "not-attribute": false,
  "pageNumber": 1,
  "departureDate": "2026-06-19",
  "arrivalDate": "2026-06-30",
  "departure": [2622],
  "type": [],
  "duration": { "min": 7, "max": 28 },
  "minPrice": null,
  "maxPrice": null,
  "service": [1],
  "firstminute": null,
  "attribute": ["29"],
  "promotion": [],
  "tourId": null,
  "search": null,
  "minCategory": null,
  "maxCategory": 50,
  "sort": 13,
  "order": 1,
  "totalPrice": true,
  "rank": null,
  "withoutTours": [],
  "withoutCountry": [],
  "withoutTrips": [],
  "rooms": [
    { "adult": 2, "kid": 2, "ages": ["20190603", "20210125"] }
  ],
  "offerCode": null,
  "dedicatedOffer": false
}
```

## Response Format

```json
{
  "success": true,
  "type": "...",
  "msg": "...",
  "datetime": "2026-02-19T15:55:16.570Z",
  "data": {
    "count": 1899,
    "offers": [ ... ],
    "requestTimeInMiliseconds": 123
  }
}
```

### Single offer object

```json
{
  "id": 16922,
  "name": "Long Beach (Avsallar)",
  "placeName": "Turcja / Riwiera Turecka / Alanya",
  "photos": {
    "570,428": ["/no-index/hotel/long-beach-avsallar-basen-807594939-570-428.jpg"]
  },
  "hotelId": 15684,
  "offerId": 16922,
  "urlName": "long-beach-avsallar",
  "category": 5,
  "maxCategory": 5,
  "place": {
    "country": { "id": 16, "name": "Turcja", "slug": "turcja", "urlName": "turcja" },
    "region": { "id": 312009, "name": "Riwiera Turecka", "slug": "riwiera-turecka" },
    "city": { "id": 312251192, "name": "Alanya", "slug": "alanya" }
  },
  "duration": 7,
  "durationNights": 7,
  "price": 15244,
  "priceDiscount": 0,
  "priceOld": 0,
  "departureDate": "2026-06-19",
  "returnDate": "2026-06-26",
  "departureType": 1,
  "departureTypeName": "Samolot",
  "departurePlaces": ["Katowice"],
  "departurePlace": "Katowice",
  "returnDestinationPlace": "Antalya",
  "returnArrivalPlace": "Katowice",
  "service": 1,
  "serviceDesc": "Ultra All Inclusive",
  "tourOperator": 552,
  "tourOperatorName": "Coral Travel",
  "ratingString": "8.8",
  "ratingValue": 8.8,
  "ratingRecommends": 255,
  "ratingReservationCount": 255,
  "originalCurrency": "PLN",
  "shownCurrency": "PLN",
  "roomType": "LONG BEACH ROH",
  "offerType": "wypoczynek",
  "offerHash": "WEZY:1733",
  "promotionTags": [],
  "promoLastMinute": false,
  "promoFirstMinute": true,
  "promoTop10": false,
  "preSale": false,
  "employeeRatingCount": 4
}
```

Photo URLs are relative — prefix with `https://www.wakacje.pl`.

## Known IDs

### Countries (`countryId`)

| ID | Name |
|----|------|
| 16 | Turcja |
| 29 | Grecja |
| 31 | Włochy |
| 32 | Chorwacja |
| 33 | Hiszpania |
| 37 | Egipt |
| 44 | Maroko |
| 65 | Tunezja |
| 74 | Portugalia |
| 99 | Malta |
| 110 | Cypr |
| 283 | Czarnogóra |
| 305 | Bułgaria |
| 436 | Albania |

### Departure airports (`departure`)

| ID | Name |
|----|------|
| 2612 | Warszawa |
| 2614 | Gdańsk |
| 2616 | Poznań |
| 2618 | Kraków |
| 2620 | Wrocław |
| 2622 | Katowice |
| 2640 | Łódź |

### Service type (`service`)

| ID | Name |
|----|------|
| 1 | All Inclusive |
| 2 | Half Board (HB) |
| 3 | Full Board (FB) |
| 4 | Bed & Breakfast (BB) |

### Attributes (`attribute`)

| ID | Name |
|----|------|
| 6 | Internet |
| 13 | Nurkowanie |
| 16 | Golf |
| 21 | Aquapark |
| 24 | Basen kryty |
| 25 | Basen odkryty |
| 26 | Blisko plaży |
| 29 | Dla dzieci |
| 36 | Bez paszportu |
| 46 | Spa & Wellness |

### Sort (`sort`)

| ID | Name |
|----|------|
| 1 | Cena rosnąco |
| 2 | Cena malejąco |
| 3 | Ocena malejąco |
| 13 | Najpopularniejsze |
| 14 | Rekomendowane |

### Rooms

`rooms` is an array (multi-room support). Each room:

```json
{
  "adult": 2,
  "kid": 2,
  "ages": ["20190603", "20210125"]
}
```

- `kid` = number of children
- `ages` = array of children birth dates in `YYYYMMDD` format
- If no children: `{ "adult": 2, "kid": 0, "ages": [] }`

## Pagination

- `params.limit` controls page size (tested up to 50)
- `params.query.pageNumber` controls page (1-indexed)
- `data.count` in response = total matching offers
- Total pages = `ceil(count / limit)`

## Headers

Minimum required:

```
Content-Type: application/json
User-Agent: <any browser UA>
Origin: https://www.wakacje.pl
Referer: https://www.wakacje.pl/wczasy/
```

No cookies or auth tokens needed.

## How it was discovered

The `searchObj` is embedded in the SSR HTML inside a `<script>` tag alongside MobX store hydration data (not in `__NEXT_DATA__` — the Next.js pageProps are empty). The stores are serialized inline and include the full request body under `storeOffers.searchObj`. The API base URL (`/v2/api`) is constructed in the app bundle: `[false, "/v2", "/api"].filter(Boolean).join("")`.

## Rate limiting

Not observed during testing, but be respectful — add 1s+ delay between requests.

## Detail Page API — Room Variants & Flights

The offer detail page (`/oferty/{country}/{region}/{city}/{slug}.html`) loads room variants via a separate API call after SSR. The SSR HTML has `"offers": []` — variants are fetched client-side.

### `POST /v2/api/getCalculatorOfferVariants/{offerId}`

Returns all room variants with prices and flight times. No auth required.

#### Request

```json
{
  "adults": 2,
  "kids": 2,
  "serviceId": 1,
  "infants": 0,
  "duration": 7,
  "kidsAges": ["20190603", "20210125"],
  "departureDate": "2026-06-19",
  "transportId": 1,
  "departureCityId": 2622,
  "departureCityCode": "WAW",
  "hotelId": 15684,
  "tourOp": "WEZY",
  "tourId": 552,
  "cruiseId": 0,
  "roundTripId": 0,
  "isAlternativeRoom": false,
  "isOffer77": false
}
```

Required fields from the search API response (not currently saved in `Offer` type):

| Field | Source in search response | Example |
|-------|--------------------------|---------|
| `hotelId` | `offer.hotelId` | `15684` |
| `tourOp` | `offer.offerHash.split(":")[0]` | `"WEZY"` |
| `tourId` | `offer.tourOperator` (numeric) | `552` |

Headers: standard browser headers + `Content-Type: application/json`, `Origin: https://www.wakacje.pl`.

#### Response

```json
{
  "success": true,
  "datetime": "2026-02-26T20:00:55.974Z",
  "data": {
    "offers": [
      {
        "id": "pR-g5_aCUWcT...",
        "roomDesc": "Long beach roh",
        "tourOp": "WEZY",
        "serviceId": 1,
        "serviceDesc": "Ultra All Inclusive",
        "transportId": 1,
        "duration": 7,
        "departureCode": "KTW",
        "basePrice": 15244,
        "totalPrice": 15244,
        "priceCurrency": "PLN",
        "roomCode": "15684",
        "roomDescAdditional": ["Ultra All Inclusive"],
        "departStart": {
          "name": "Katowice", "airportCode": "KTW",
          "date": "2026-06-19", "time": "01:00",
          "flightOp": "Free Bird Airlines", "carrierCode": "FH 770"
        },
        "departEnd": {
          "name": "Antalya", "airportCode": "AYT",
          "date": "2026-06-19", "time": "04:55"
        },
        "returnStart": {
          "name": "Antalya", "airportCode": "AYT",
          "date": "2026-06-26", "time": "06:05",
          "flightOp": "Pegasus Airlines", "carrierCode": "PC 6277"
        },
        "returnEnd": {
          "name": "Katowice", "airportCode": "KTW",
          "date": "2026-06-26", "time": "07:50"
        }
      }
    ]
  }
}
```

Typically returns 10+ variants sorted by price. Each variant represents a different room type and/or flight combination for the same hotel.

#### Key finding: prices match the search API

Testing confirmed that the cheapest variant's `totalPrice` equals the search API `price` — the search API is **not** returning approximate prices. Any discrepancy a user sees is due to prices changing over time (dynamic pricing), not a systematic difference between APIs.

#### Other detail page endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v2/api/getOfferDataFromMerlin` | POST | Hotel metadata, attributes, promo flags |
| `/v2/api/checkOfferAvailability` | GET | Real-time availability + per-person price breakdown |
| `/v2/api/getIncludedLuggage` | POST | Baggage allowance info |
| `/v2/api/offerConfiguratorV2/filters` | POST | Available filter options for the offer |
| `/v2/api/getDescription` | GET | Full offer description text |
| `/v2/api/getFacilities/{hotelId}` | GET | Hotel facilities details |
| `/v2/api/getTranches` | GET | Payment installment options |
| `/v2/api/getCrossell` | POST | Cross-sell products (parking, insurance) |
| `/v2/api/getAdditionalProducts` | POST | Additional purchasable products |

`checkOfferAvailability` is particularly useful — it takes an `offerHash` (from `getCalculatorOfferVariants`) and returns real-time availability, exact per-person prices, flight details, baggage info, and transfer details.
