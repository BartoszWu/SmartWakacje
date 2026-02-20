export const initialState = {
  country: 'all',
  search: '',
  priceMin: 0,
  priceMax: Infinity,
  priceTotalMin: 0,
  priceTotalMax: 14000,
  minRating: 0,
  minGmaps: 0,
  minTrivago: 0,
  minTA: 0,
  minStars: 0,
  minEmployeeRating: 0,
  page: 1,
  perPage: 20,
  sortPrimary: 'ratingValue',
  sortPrimaryDir: 'desc',
  sortSecondary: 'pricePerPerson',
  sortSecondaryDir: 'asc',
}

export function filtersReducer(state, action) {
  switch (action.type) {
    case 'SET_COUNTRY':
      return { ...state, country: action.payload, page: 1 }
    case 'SET_SEARCH':
      return { ...state, search: action.payload, page: 1 }
    case 'SET_PRICE_MIN':
      return { ...state, priceMin: action.payload || 0, page: 1 }
    case 'SET_PRICE_MAX':
      return { ...state, priceMax: action.payload || Infinity, page: 1 }
    case 'SET_PRICE_TOTAL_MIN':
      return { ...state, priceTotalMin: action.payload || 0, page: 1 }
    case 'SET_PRICE_TOTAL_MAX':
      return { ...state, priceTotalMax: action.payload || Infinity, page: 1 }
    case 'SET_MIN_RATING':
      return { ...state, minRating: action.payload || 0, page: 1 }
    case 'SET_MIN_GMAPS':
      return { ...state, minGmaps: action.payload || 0, page: 1 }
    case 'SET_MIN_TRIVAGO':
      return { ...state, minTrivago: action.payload || 0, page: 1 }
    case 'SET_MIN_TA':
      return { ...state, minTA: action.payload || 0, page: 1 }
    case 'SET_MIN_STARS':
      return { ...state, minStars: action.payload || 0, page: 1 }
    case 'SET_MIN_EMPLOYEE_RATING':
      return { ...state, minEmployeeRating: action.payload || 0, page: 1 }
    case 'SET_PAGE':
      return { ...state, page: action.payload }
    case 'SET_PER_PAGE':
      return { ...state, perPage: action.payload, page: 1 }
    case 'SET_SORT_PRIMARY':
      return { ...state, sortPrimary: action.payload, page: 1 }
    case 'SET_SORT_PRIMARY_DIR':
      return { ...state, sortPrimaryDir: action.payload }
    case 'SET_SORT_SECONDARY':
      return { ...state, sortSecondary: action.payload, page: 1 }
    case 'SET_SORT_SECONDARY_DIR':
      return { ...state, sortSecondaryDir: action.payload }
    case 'RESET':
      return { ...initialState }
    case 'SET_PAGE_KEEP':
      return { ...state, page: action.payload }
    default:
      return state
  }
}

export function filterAndSort(offers, state) {
  let list = [...offers]

  if (state.country !== 'all') {
    list = list.filter(o => o.country === state.country)
  }

  if (state.search) {
    const q = state.search.toLowerCase()
    list = list.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.placeName?.toLowerCase().includes(q) ||
      o.tourOperator?.toLowerCase().includes(q)
    )
  }

  if (state.priceMin > 0) list = list.filter(o => o.pricePerPerson >= state.priceMin)
  if (state.priceMax < Infinity) list = list.filter(o => o.pricePerPerson <= state.priceMax)

  if (state.priceTotalMin > 0) list = list.filter(o => o.price >= state.priceTotalMin)
  if (state.priceTotalMax < Infinity) list = list.filter(o => o.price <= state.priceTotalMax)

  if (state.minRating > 0) list = list.filter(o => (o.ratingValue || 0) >= state.minRating)
  if (state.minGmaps > 0) list = list.filter(o => (o.googleRating || 0) >= state.minGmaps)
  if (state.minTrivago > 0) list = list.filter(o => (o.trivagoRating || 0) >= state.minTrivago)
  if (state.minTA > 0) list = list.filter(o => (o.taRating || 0) >= state.minTA)
  if (state.minStars > 0) list = list.filter(o => (o.category || 0) >= state.minStars)
  if (state.minEmployeeRating > 0) list = list.filter(o => (o.employeeRatingCount || 0) >= state.minEmployeeRating)

  list.sort((a, b) => {
    const valA1 = a[state.sortPrimary] ?? 0
    const valB1 = b[state.sortPrimary] ?? 0
    const dir1 = state.sortPrimaryDir === 'desc' ? -1 : 1
    const cmp1 = (valA1 - valB1) * dir1
    if (cmp1 !== 0) return cmp1

    const valA2 = a[state.sortSecondary] ?? 0
    const valB2 = b[state.sortSecondary] ?? 0
    const dir2 = state.sortSecondaryDir === 'desc' ? -1 : 1
    return (valA2 - valB2) * dir2
  })

  return list
}

export function getActiveFilterCount(state) {
  let count = 0
  if (state.priceMin > 0) count++
  if (state.priceMax < Infinity) count++
  if (state.priceTotalMin > 0) count++
  if (state.priceTotalMax < Infinity) count++
  if (state.minRating > 0) count++
  if (state.minGmaps > 0) count++
  if (state.minTrivago > 0) count++
  if (state.minTA > 0) count++
  if (state.minStars > 0) count++
  if (state.minEmployeeRating > 0) count++
  return count
}
