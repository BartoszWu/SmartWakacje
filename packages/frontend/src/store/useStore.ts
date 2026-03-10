import { create } from "zustand";
import { withComputedScores, type Offer, type SortConfig, type FilterState, type SnapshotMeta } from "@smartwakacje/shared";

type View = "home" | "offers" | "offerDetail";

/* ── URL helpers ─────────────────────────────────── */
export function offerSlug(name: string): string {
  return encodeURIComponent(name);
}

export function buildOfferDetailPath(snapshotId: string, offerName: string): string {
  return `/offer/${snapshotId}/${offerSlug(offerName)}`;
}

export function buildSnapshotPath(snapshotId: string): string {
  return `/offers/${snapshotId}`;
}

type ParsedRoute =
  | { view: "home" }
  | { view: "offers"; snapshotId: string }
  | { view: "offerDetail"; snapshotId: string; offerName: string };

export function parseRoute(pathname: string): ParsedRoute {
  const offerMatch = pathname.match(/^\/offer\/([^/]+)\/(.+)$/);
  if (offerMatch) {
    return { view: "offerDetail", snapshotId: offerMatch[1], offerName: decodeURIComponent(offerMatch[2]) };
  }
  const offersMatch = pathname.match(/^\/offers\/([^/]+)\/?$/);
  if (offersMatch) {
    return { view: "offers", snapshotId: offersMatch[1] };
  }
  return { view: "home" };
}

interface StoreState {
  // Navigation
  view: View;
  activeSnapshotId: string | null;
  activeSnapshotMeta: SnapshotMeta | null;
  activeOffer: Offer | null;
  /** When navigating to /offer/:id/:name via URL, stores the name until offers load */
  pendingOfferName: string | null;

  // Offers data
  offers: Offer[];
  filteredOffers: Offer[];
  filters: FilterState;
  sort: SortConfig;
  page: number;
  perPage: number;
  countries: string[];
  trivagoNotFound: Set<string>;

  // Navigation actions
  setView: (view: View) => void;
  openSnapshot: (snapshotId: string, meta?: SnapshotMeta | null) => void;
  openOfferDetail: (offer: Offer) => void;
  goBackToOffers: () => void;
  goHome: () => void;
  /** Restore state from URL without pushing to history */
  restoreFromUrl: () => void;

  // Data actions
  setOffers: (offers: Offer[]) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  setSort: (sort: Partial<SortConfig>) => void;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  applyFilters: () => void;
  updateOffer: (name: string, updates: Partial<Offer>) => void;
  markTrivagoNotFound: (name: string) => void;
}

const initialFilters: FilterState = {
  country: "all",
  search: "",
  priceMin: 0,
  priceMax: Infinity,
  priceTotalMin: 0,
  priceTotalMax: Infinity,
  minRating: 0,
  minGmaps: 0,
  minTrivago: 0,
  minTA: 0,
  minStars: 0,
  minEmployeeRating: 0,
};

const initialSort: SortConfig = {
  primary: "ratingValue",
  primaryDir: "desc",
  secondary: "pricePerPerson",
  secondaryDir: "asc",
};

export const useStore = create<StoreState>((set, get) => ({
  // Navigation
  view: "home",
  activeSnapshotId: null,
  activeSnapshotMeta: null,
  activeOffer: null,
  pendingOfferName: null,

  // Offers data
  offers: [],
  filteredOffers: [],
  filters: initialFilters,
  sort: initialSort,
  page: 1,
  perPage: 20,
  countries: [],
  trivagoNotFound: new Set(),

  // Navigation actions
  setView: (view) => set({ view }),

  openSnapshot: (snapshotId, meta) => {
    set({
      view: "offers",
      activeSnapshotId: snapshotId,
      activeSnapshotMeta: meta ?? null,
      activeOffer: null,
      pendingOfferName: null,
      offers: [],
      filteredOffers: [],
      filters: initialFilters,
      page: 1,
    });
    history.pushState(null, "", buildSnapshotPath(snapshotId));
  },

  openOfferDetail: (offer) => {
    const snapshotId = get().activeSnapshotId;
    set({ view: "offerDetail", activeOffer: offer, pendingOfferName: null });
    if (snapshotId) {
      history.pushState(null, "", buildOfferDetailPath(snapshotId, offer.name));
    }
    window.scrollTo(0, 0);
  },

  goBackToOffers: () => {
    const snapshotId = get().activeSnapshotId;
    set({ view: "offers", activeOffer: null, pendingOfferName: null });
    if (snapshotId) {
      history.pushState(null, "", buildSnapshotPath(snapshotId));
    }
  },

  goHome: () => {
    set({
      view: "home",
      activeSnapshotId: null,
      activeSnapshotMeta: null,
      activeOffer: null,
      pendingOfferName: null,
      offers: [],
      filteredOffers: [],
      filters: initialFilters,
      page: 1,
    });
    history.pushState(null, "", "/");
  },

  restoreFromUrl: () => {
    const route = parseRoute(window.location.pathname);
    if (route.view === "offers") {
      set({
        view: "offers",
        activeSnapshotId: route.snapshotId,
        activeSnapshotMeta: null,
        activeOffer: null,
        pendingOfferName: null,
        offers: [],
        filteredOffers: [],
        filters: initialFilters,
        page: 1,
      });
    } else if (route.view === "offerDetail") {
      // Load snapshot first, mark pending offer name to resolve once offers load
      set({
        view: "offers", // temporarily "offers" until the offer is found
        activeSnapshotId: route.snapshotId,
        activeSnapshotMeta: null,
        activeOffer: null,
        pendingOfferName: route.offerName,
        offers: [],
        filteredOffers: [],
        filters: initialFilters,
        page: 1,
      });
    } else {
      set({
        view: "home",
        activeSnapshotId: null,
        activeSnapshotMeta: null,
        activeOffer: null,
        pendingOfferName: null,
      });
    }
  },

  // Data actions
  setOffers: (offers) => {
    const enriched = offers.map(withComputedScores);
    const countries = [...new Set(enriched.map((o) => o.country))].sort();
    set({ offers: enriched, countries });
    get().applyFilters();

    // Resolve pending offer from URL navigation
    const { pendingOfferName } = get();
    if (pendingOfferName) {
      const match = enriched.find((o) => o.name === pendingOfferName);
      if (match) {
        set({ view: "offerDetail", activeOffer: match, pendingOfferName: null });
        window.scrollTo(0, 0);
      } else {
        // Offer not found -- stay on offers list
        set({ pendingOfferName: null });
      }
    }
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
      page: 1,
    }));
    get().applyFilters();
  },

  resetFilters: () => {
    set({ filters: initialFilters, page: 1 });
    get().applyFilters();
  },

  setSort: (sort) => {
    set((state) => ({ sort: { ...state.sort, ...sort } }));
    get().applyFilters();
  },

  setPage: (page) => {
    set({ page });
  },

  setPerPage: (perPage) => {
    set({ perPage, page: 1 });
  },

  applyFilters: () => {
    const { offers, filters, sort } = get();
    let list = [...offers];

    if (filters.country !== "all") {
      list = list.filter((o) => o.country === filters.country);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.placeName.toLowerCase().includes(q) ||
          o.tourOperator.toLowerCase().includes(q)
      );
    }

    if (filters.priceMin > 0) {
      list = list.filter((o) => o.pricePerPerson >= filters.priceMin);
    }
    if (filters.priceMax < Infinity) {
      list = list.filter((o) => o.pricePerPerson <= filters.priceMax);
    }

    if (filters.priceTotalMin > 0) {
      list = list.filter((o) => o.price >= filters.priceTotalMin);
    }
    if (filters.priceTotalMax < Infinity) {
      list = list.filter((o) => o.price <= filters.priceTotalMax);
    }

    if (filters.minRating > 0) {
      list = list.filter((o) => (o.ratingValue || 0) >= filters.minRating);
    }

    if (filters.minGmaps > 0) {
      list = list.filter((o) => (o.googleRating || 0) >= filters.minGmaps);
    }

    if (filters.minTrivago > 0) {
      list = list.filter((o) => (o.trivagoRating || 0) >= filters.minTrivago);
    }

    if (filters.minTA > 0) {
      list = list.filter((o) => (o.taRating || 0) >= filters.minTA);
    }

    if (filters.minStars > 0) {
      list = list.filter((o) => (o.category || 0) >= filters.minStars);
    }

    if (filters.minEmployeeRating > 0) {
      list = list.filter((o) => (o.employeeRatingCount || 0) >= filters.minEmployeeRating);
    }

    list.sort((a, b) => {
      const valA1 = a[sort.primary] ?? 0;
      const valB1 = b[sort.primary] ?? 0;
      const dir1 = sort.primaryDir === "desc" ? -1 : 1;
      const cmp1 = (typeof valA1 === "number" && typeof valB1 === "number" ? valA1 - valB1 : 0) * dir1;
      if (cmp1 !== 0) return cmp1;

      const valA2 = a[sort.secondary] ?? 0;
      const valB2 = b[sort.secondary] ?? 0;
      const dir2 = sort.secondaryDir === "desc" ? -1 : 1;
      return (typeof valA2 === "number" && typeof valB2 === "number" ? valA2 - valB2 : 0) * dir2;
    });

    set({ filteredOffers: list });
  },

  updateOffer: (name, updates) => {
    set((state) => ({
      offers: state.offers.map((o) =>
        o.name === name ? withComputedScores({ ...o, ...updates }) : o
      ),
    }));
    get().applyFilters();
  },

  markTrivagoNotFound: (name) => {
    set((state) => ({
      trivagoNotFound: new Set(state.trivagoNotFound).add(name),
    }));
  },
}));
