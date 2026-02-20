'use client'

import { useReducer, useMemo } from 'react'
import { filtersReducer, initialState, filterAndSort } from '@/hooks/useFiltersReducer'
import { Header } from './Header'
import { Controls } from './Controls'
import { FilterBar } from './FilterBar'
import { Grid } from './Grid'
import { Pagination } from './Pagination'

export function OffersPage({ initialOffers }) {
  const [state, dispatch] = useReducer(filtersReducer, initialState)

  const countries = useMemo(() => 
    [...new Set(initialOffers.map(o => o.country))].sort(),
    [initialOffers]
  )

  const filteredOffers = useMemo(() => 
    filterAndSort(initialOffers, state),
    [initialOffers, state]
  )

  const totalPages = Math.ceil(filteredOffers.length / state.perPage)

  const handlePageChange = (page) => {
    dispatch({ type: 'SET_PAGE', payload: page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePerPageChange = (perPage) => {
    dispatch({ type: 'SET_PER_PAGE', payload: perPage })
  }

  const handleFetchAll = () => {
    console.log('Fetch all ratings - TODO')
  }

  return (
    <>
      <Header offers={filteredOffers} />
      <Controls countries={countries} state={state} dispatch={dispatch} />
      <FilterBar state={state} dispatch={dispatch} onFetchAll={handleFetchAll} />
      <OfferCount total={initialOffers.length} filtered={filteredOffers.length} page={state.page} perPage={state.perPage} />
      <Grid offers={filteredOffers} page={state.page} perPage={state.perPage} />
      <Pagination 
        currentPage={state.page}
        totalPages={totalPages}
        perPage={state.perPage}
        onPageChange={handlePageChange}
        onPerPageChange={handlePerPageChange}
      />
    </>
  )
}

function OfferCount({ total, filtered, page, perPage }) {
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, filtered)
  const range = filtered > 0 ? `${start}-${end}` : ''

  return (
    <div className="max-w-[1440px] mx-auto px-8 text-xs font-semibold text-sand-dim">
      {filtered === total ? (
        <><span className="text-sand-bright">{filtered}</span> ofert</>
      ) : (
        <><span className="text-sand-bright">{range}</span> z <span className="text-sand-bright">{filtered}</span> ofert ({total} łącznie)</>
      )}
    </div>
  )
}
