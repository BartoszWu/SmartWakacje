import { create } from "zustand";
import type { Offer, SortConfig, FilterState, SnapshotMeta } from "@smartwakacje/shared";

type View = "home" | "offers";

interface StoreState {
  // Navigation
  view: View;
  activeSnapshotId: string | null;
  activeSnapshotMeta: SnapshotMeta | null;

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
  goHome: () => void;

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
      offers: [],
      filteredOffers: [],
      filters: initialFilters,
      page: 1,
    });
  },

  goHome: () => {
    set({
      view: "home",
      activeSnapshotId: null,
      activeSnapshotMeta: null,
      offers: [],
      filteredOffers: [],
      filters: initialFilters,
      page: 1,
    });
  },

  // Data actions
  setOffers: (offers) => {
    const countries = [...new Set(offers.map((o) => o.country))].sort();
    set({ offers, countries });
    get().applyFilters();
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
      offers: state.offers.map((o) => (o.name === name ? { ...o, ...updates } : o)),
    }));
    get().applyFilters();
  },

  markTrivagoNotFound: (name) => {
    set((state) => ({
      trivagoNotFound: new Set(state.trivagoNotFound).add(name),
    }));
  },
}));
