'use client'

import { getActiveFilterCount } from '@/hooks/useFiltersReducer'

export function FilterBar({ state, dispatch, onFetchAll }) {
  const activeCount = getActiveFilterCount(state)

  const handleReset = () => {
    dispatch({ type: 'RESET' })
  }

  return (
    <div className="max-w-[1440px] mx-auto px-8 pb-2 flex flex-col gap-2 relative z-49">
      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sand-dim">Cena / os (zł)</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={state.priceMin || ''}
              onChange={e => dispatch({ type: 'SET_PRICE_MIN', payload: e.target.value ? Number(e.target.value) : 0 })}
              placeholder="od"
              min="0"
              step="100"
              className="w-[90px] py-1.5 px-2 rounded-sm border border-sand/10 bg-white/5 text-sand-bright text-xs font-medium outline-none transition-colors focus:border-accent placeholder:text-sand-dim/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-sand-dim text-xs px-0.5">–</span>
            <input
              type="number"
              value={state.priceMax === Infinity ? '' : state.priceMax}
              onChange={e => dispatch({ type: 'SET_PRICE_MAX', payload: e.target.value ? Number(e.target.value) : Infinity })}
              placeholder="do"
              min="0"
              step="100"
              className="w-[90px] py-1.5 px-2 rounded-sm border border-sand/10 bg-white/5 text-sand-bright text-xs font-medium outline-none transition-colors focus:border-accent placeholder:text-sand-dim/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sand-dim">Cena total (zł)</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={state.priceTotalMin || ''}
              onChange={e => dispatch({ type: 'SET_PRICE_TOTAL_MIN', payload: e.target.value ? Number(e.target.value) : 0 })}
              placeholder="od"
              min="0"
              step="500"
              className="w-[90px] py-1.5 px-2 rounded-sm border border-sand/10 bg-white/5 text-sand-bright text-xs font-medium outline-none transition-colors focus:border-accent placeholder:text-sand-dim/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-sand-dim text-xs px-0.5">–</span>
            <input
              type="number"
              value={state.priceTotalMax === Infinity ? '' : state.priceTotalMax}
              onChange={e => dispatch({ type: 'SET_PRICE_TOTAL_MAX', payload: e.target.value ? Number(e.target.value) : Infinity })}
              placeholder="do"
              min="0"
              step="500"
              className="w-[90px] py-1.5 px-2 rounded-sm border border-sand/10 bg-white/5 text-sand-bright text-xs font-medium outline-none transition-colors focus:border-accent placeholder:text-sand-dim/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sand-dim">Gwiazdki</span>
          <select
            value={state.minStars}
            onChange={e => dispatch({ type: 'SET_MIN_STARS', payload: Number(e.target.value) })}
            className="py-1.5 px-2 rounded-sm border border-sand/10 bg-white/5 text-sand-bright text-xs font-medium outline-none cursor-pointer transition-colors focus:border-accent appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22%23a89b88%22%3E%3Cpath%20d%3D%22M6%208.5L1.5%204h9z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.4rem_center] pr-5"
          >
            <option value={0}>Wszystkie</option>
            <option value={3}>3+</option>
            <option value={4}>4+</option>
            <option value={5}>5</option>
          </select>
        </div>

        <div className="flex-1" />

        {activeCount > 0 && (
          <span className="text-[10px] font-semibold text-accent pb-1">
            {activeCount} aktywn{activeCount === 1 ? 'y' : 'e'} filtr{activeCount === 1 ? '' : 'y'}
          </span>
        )}
        <button
          type="button"
          onClick={handleReset}
          className="py-1.5 px-2.5 rounded-sm border border-red/30 bg-transparent text-red text-[10px] font-semibold cursor-pointer transition-colors hover:bg-red/10 hover:border-red"
        >
          Resetuj filtry
        </button>

        <FetchMenu onFetchAll={onFetchAll} />
      </div>

      <div className="flex items-center gap-0.5 py-1 px-2 bg-white/[0.025] border border-sand/5 rounded-sm flex-wrap">
        <FilterPill
          label="W"
          labelClass="text-gold"
          value={state.minRating}
          options={[
            { value: 0, label: 'Wakacje.pl' },
            { value: 6, label: '6+' },
            { value: 7, label: '7+' },
            { value: 7.5, label: '7.5+' },
            { value: 8, label: '8+' },
            { value: 8.5, label: '8.5+' },
            { value: 9, label: '9+' },
          ]}
          onChange={v => dispatch({ type: 'SET_MIN_RATING', payload: v })}
        />

        <FilterPill
          label="G"
          labelClass="text-[#6aabf7]"
          value={state.minGmaps}
          options={[
            { value: 0, label: 'GMaps' },
            { value: 3.5, label: '3.5+' },
            { value: 4, label: '4.0+' },
            { value: 4.2, label: '4.2+' },
            { value: 4.5, label: '4.5+' },
            { value: 4.7, label: '4.7+' },
          ]}
          onChange={v => dispatch({ type: 'SET_MIN_GMAPS', payload: v })}
        />

        <FilterPill
          label="tv"
          labelClass="text-[#a78bfa]"
          value={state.minTrivago}
          options={[
            { value: 0, label: 'Trivago' },
            { value: 7, label: '7.0+' },
            { value: 7.5, label: '7.5+' },
            { value: 8, label: '8.0+' },
            { value: 8.5, label: '8.5+' },
            { value: 9, label: '9.0+' },
          ]}
          onChange={v => dispatch({ type: 'SET_MIN_TRIVAGO', payload: v })}
        />

        <FilterPill
          label="TA"
          labelClass="text-[#4ade80]"
          value={state.minTA}
          options={[
            { value: 0, label: 'TripAdvisor' },
            { value: 3.5, label: '3.5+' },
            { value: 4, label: '4.0+' },
            { value: 4.2, label: '4.2+' },
            { value: 4.5, label: '4.5+' },
          ]}
          onChange={v => dispatch({ type: 'SET_MIN_TA', payload: v })}
        />

        <div className="w-px h-4 bg-sand/10 mx-1" />

        <FilterPill
          label="✎"
          labelClass="text-sand-dim"
          value={state.minEmployeeRating}
          options={[
            { value: 0, label: 'Ocen prac.' },
            { value: 1, label: '1+' },
            { value: 3, label: '3+' },
            { value: 5, label: '5+' },
            { value: 10, label: '10+' },
            { value: 20, label: '20+' },
          ]}
          onChange={v => dispatch({ type: 'SET_MIN_EMPLOYEE_RATING', payload: v })}
        />
      </div>
    </div>
  )
}

function FilterPill({ label, labelClass, value, options, onChange }) {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      <span className={`text-[10px] font-extrabold uppercase tracking-wider opacity-85 ${labelClass}`}>
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="border-none bg-transparent py-1 px-1 pr-4 text-xs font-semibold text-sand-bright outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23a89b88%22%3E%3Cpath%20d%3D%22M5%207L1%203h8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_2px_center]"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function FetchMenu({ onFetchAll }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onFetchAll}
        className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-sm border border-sand/10 bg-sand/5 text-sand-dim text-[11px] font-semibold cursor-pointer transition-colors hover:bg-sand/10 hover:border-sand/30 hover:text-sand-bright"
      >
        Pobierz dane
        <svg className="w-3 h-3 opacity-70" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="2 4 6 8 10 4"/>
        </svg>
      </button>
    </div>
  )
}
