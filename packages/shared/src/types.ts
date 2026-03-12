export interface Offer {
  id: string;
  hotelId?: number;
  name: string;
  placeName: string;
  url: string;
  country: string;
  region: string;
  city: string;
  duration: number;
  departureDate: string;
  returnDate: string;
  ratingValue: number;
  ratingRecommends: number;
  ratingReservationCount: number;
  employeeRatingCount: number;
  price: number;
  pricePerPerson: number;
  priceOld: number | null;
  priceDiscount: number | null;
  category: number;
  serviceDesc: string;
  tourOperator: string;
  promoLastMinute: boolean;
  promoFirstMinute: boolean;
  photo: string;
  photos?: string[];
  googleRating?: number;
  googleRatingsTotal?: number;
  googleMapsUrl?: string;
  googlePlaceId?: string;
  taRating?: number;
  taReviewCount?: number;
  taUrl?: string;
  taLocationId?: string;
  trivagoRating?: number;
  trivagoReviewsCount?: number;
  trivagoUrl?: string;
  trivagoNsid?: number;
  trivagoAspects?: TrivagoAspects;
  offerHash?: string;
  tourOperatorId?: number;
  departurePlace?: string;
  departureTypeName?: string;
  departurePlaceCode?: string;
  roomType?: string;
  tourOpCode?: string;
  qualityScore?: number;
  valueScore?: number;
}

export interface TrivagoAspects {
  cleanliness?: number;
  location?: number;
  comfort?: number;
  valueForMoney?: number;
  service?: number;
  food?: number;
  rooms?: number;
}

export interface GoogleSearchResult {
  name: string;
  rating: number;
  totalRatings: number;
  address: string;
  placeId: string;
  mapsUrl: string;
}

export interface GoogleCacheEntry {
  results: GoogleSearchResult[];
  selected: number | null;
  fetchedAt?: string;
}

export interface TASearchResult {
  locationId: string;
  name: string;
  address: string;
  rating: number | null;
  numReviews: number | null;
  taUrl: string | null;
}

export interface TACacheEntry {
  results: TASearchResult[];
  selected: number | null;
  fetchedAt?: string;
}

export interface TrivagoSearchResult {
  nsid: number;
  name: string;
  locationLabel: string;
  rating: number | null;
  reviewsCount: number | null;
  trivagoUrl: string;
  aspects: TrivagoAspects | null;
}

export interface TrivagoCacheEntry {
  results: TrivagoSearchResult[];
  selected: number | null;
  fetchedAt?: string;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
  pricePerPerson: number;
  snapshotId: string;
}

export interface PriceHistoryResult {
  hotelName: string;
  points: PriceHistoryPoint[];
  currentPrice: number;
  currentPricePerPerson: number;
  minPrice: number;
  maxPrice: number;
  minPricePerPerson: number;
  maxPricePerPerson: number;
  priceChange: number | null;
  priceChangePercent: number | null;
}

export type SortField =
  | "ratingValue"
  | "googleRating"
  | "trivagoRating"
  | "taRating"
  | "qualityScore"
  | "valueScore"
  | "pricePerPerson"
  | "price"
  | "category"
  | "duration"
  | "ratingRecommends"
  | "ratingReservationCount"
  | "employeeRatingCount";

export type RatingSource = "google" | "trivago" | "tripAdvisor" | "wakacje";

export type QualityMode = "precomputed" | "legacy";

export interface SortConfig {
  primary: SortField;
  primaryDir: "asc" | "desc";
  secondary: SortField;
  secondaryDir: "asc" | "desc";
}

export interface FilterState {
  country: string;
  search: string;
  priceMin: number;
  priceMax: number;
  priceTotalMin: number;
  priceTotalMax: number;
  minRating: number;
  minGmaps: number;
  minTrivago: number;
  minTA: number;
  minStars: number;
  minEmployeeRating: number;
  minGmapsCount: number;
  minTrivagoCount: number;
  minTACount: number;
  minWakacjeCount: number;
}

export interface ScraperConfig {
  departureDateFrom: string;
  departureDateTo: string;
  airports: number[];
  countries: number[];
  service: number;
  adults: number;
  children: number;
  childAges: string[];
  attributes: number[];
  pageSize: number;
  delayBetweenPages: number;
  minPrice?: number;
  maxPrice?: number;
  fetchDescriptions?: boolean;
}

export interface FetchProviderConfig {
  minRating?: number;
  maxPrice?: number;
  batchSize?: number;
  batchDelayMs?: number;
}

export interface FetchConfig {
  minRating: number;
  maxPrice: number;
  batchSize: number;
  batchDelayMs: number;
  googleMaps?: FetchProviderConfig;
  tripAdvisor?: FetchProviderConfig;
  trivago?: FetchProviderConfig;
}

export interface ReportConfig {
  maxPrice: number;
  minGmaps: number;
  minTripAdvisor: number;
  minTrivago: number;
}

export interface SnapshotMeta {
  id: string;
  createdAt: string;
  offerCount: number;
  filters: ScraperConfig;
  countries: string[];
}

export interface OfferVariant {
  id: string;
  serviceDesc: string;
  duration: number;
  numberOfNights: number;
  totalPrice: number;
  departureCity: string;
  departureDate: string;
  returnDate: string;
  departureTime?: string;
  arrivalTime?: string;
  returnDepartTime?: string;
  returnArrivalTime?: string;
  roomDesc?: string;
}

export interface FavoriteEntry {
  addedAt: string;
  hotelId?: number;
}

export interface DescriptionSection {
  label: string;
  value: string;
}

export interface DescriptionCacheEntry {
  descriptions: DescriptionSection[];
  facilities?: {
    hotelFacilities: { title: string; item: string[] };
    hotelAttractions: { title: string; item: string[] };
  };
  fetchedAt: string;
}

export interface RawWakacjeOffer {
  id: number;
  hotelId?: number;
  name: string;
  placeName: string;
  url: string;
  country: { name: string };
  region: { name: string };
  city: { name: string };
  duration: number;
  departureDate: string;
  returnDate: string;
  ratingValue: number;
  ratingRecommends: number;
  ratingReservationCount: number;
  employeeRatingCount: number;
  price: number;
  pricePerPerson: number;
  priceOld: number | null;
  priceDiscount: number | null;
  category: number;
  serviceDesc: string;
  tourOperator: { name: string };
  promoLastMinute: boolean;
  promoFirstMinute: boolean;
  photo: { url: string };
}
