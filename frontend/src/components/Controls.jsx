'use client'

export function Controls({ countries, state, dispatch }) {
  const handleCountryClick = (country) => {
    dispatch({ type: 'SET_COUNTRY', payload: country })
  }

  const handleSearchChange = (e) => {
    dispatch({ type: 'SET_SEARCH', payload: e.target.value })
  }

  const handleSortPrimaryChange = (e) => {
    dispatch({ type: 'SET_SORT_PRIMARY', payload: e.target.value })
  }

  const handleSortPrimaryDirToggle = () => {
    dispatch({ 
      type: 'SET_SORT_PRIMARY_DIR', 
      payload: state.sortPrimaryDir === 'desc' ? 'asc' : 'desc' 
    })
  }

  const handleSortSecondaryChange = (e) => {
    dispatch({ type: 'SET_SORT_SECONDARY', payload: e.target.value })
  }

  const handleSortSecondaryDirToggle = () => {
    dispatch({ 
      type: 'SET_SORT_SECONDARY_DIR', 
      payload: state.sortSecondaryDir === 'desc' ? 'asc' : 'desc' 
    })
  }

  return (
    <div className="max-w-[1440px] mx-auto px-8 py-2 pb-3 flex flex-wrap gap-2 items-center relative z-50">
      <button
        type="button"
        onClick={() => handleCountryClick('all')}
        className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
          state.country === 'all'
            ? 'bg-accent border-accent text-white'
            : 'border-sand/15 text-sand-dim hover:border-sand-dim hover:text-sand'
        }`}
      >
        Wszystkie
      </button>

      {countries.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => handleCountryClick(c)}
          className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
            state.country === c
              ? 'bg-accent border-accent text-white'
              : 'border-sand/15 text-sand-dim hover:border-sand-dim hover:text-sand'
          }`}
        >
          {c}
        </button>
      ))}

      <div className="w-px h-6 bg-sand/10 mx-1" />

      <div className="relative flex-1 min-w-[180px] max-w-[320px]">
        <svg 
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 stroke-sand-dim fill-none"
          viewBox="0 0 24 24" 
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={state.search}
          onChange={handleSearchChange}
          placeholder="Szukaj hotelu..."
          className="w-full py-1.5 px-2 pl-8 rounded-full border border-sand/10 bg-white/5 text-sand-bright text-xs outline-none transition-colors focus:border-accent placeholder:text-sand-dim/70"
        />
      </div>

      <div className="w-px h-6 bg-sand/10 mx-1" />

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-sand-dim">Sortuj</span>
        <select
          value={state.sortPrimary}
          onChange={handleSortPrimaryChange}
          className="py-1 px-2 rounded-sm border border-sand/10 bg-white/5 text-sand-bright text-xs font-medium outline-none cursor-pointer transition-colors focus:border-accent appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22%23a89b88%22%3E%3Cpath%20d%3D%22M6%208.5L1.5%204h9z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.4rem_center] pr-5"
        >
          <option value="ratingValue">Wakacje.pl</option>
          <option value="googleRating">GMaps</option>
          <option value="trivagoRating">Trivago</option>
          <option value="taRating">TripAdvisor</option>
          <option value="employeeRatingCount">Ocen prac.</option>
          <option value="pricePerPerson">Cena / os</option>
          <option value="price">Cena total</option>
          <option value="ratingRecommends">Polecenia</option>
          <option value="ratingReservationCount">Rezerwacje</option>
          <option value="category">Gwiazdki</option>
          <option value="duration">Czas trwania</option>
        </select>
        <button
          type="button"
          onClick={handleSortPrimaryDirToggle}
          title="Kierunek sortowania"
          className={`w-7 h-7 rounded-sm border border-sand/10 bg-transparent text-sand-dim text-xs cursor-pointer flex items-center justify-center transition-colors hover:border-sand-dim hover:text-sand ${state.sortPrimaryDir === 'desc' ? 'scale-y-[-1]' : ''}`}
        >
          ▲
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-sand-dim">potem</span>
        <select
          value={state.sortSecondary}
          onChange={handleSortSecondaryChange}
          className="py-1 px-2 rounded-sm border border-sand/10 bg-white/5 text-sand-bright text-xs font-medium outline-none cursor-pointer transition-colors focus:border-accent appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22%23a89b88%22%3E%3Cpath%20d%3D%22M6%208.5L1.5%204h9z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.4rem_center] pr-5"
        >
          <option value="pricePerPerson">Cena / os</option>
          <option value="ratingValue">Wakacje.pl</option>
          <option value="googleRating">GMaps</option>
          <option value="trivagoRating">Trivago</option>
          <option value="taRating">TripAdvisor</option>
          <option value="employeeRatingCount">Ocen prac.</option>
          <option value="price">Cena total</option>
          <option value="ratingRecommends">Polecenia</option>
          <option value="ratingReservationCount">Rezerwacje</option>
          <option value="category">Gwiazdki</option>
          <option value="duration">Czas trwania</option>
        </select>
        <button
          type="button"
          onClick={handleSortSecondaryDirToggle}
          title="Kierunek sortowania"
          className={`w-7 h-7 rounded-sm border border-sand/10 bg-transparent text-sand-dim text-xs cursor-pointer flex items-center justify-center transition-colors hover:border-sand-dim hover:text-sand ${state.sortSecondaryDir === 'desc' ? 'scale-y-[-1]' : ''}`}
        >
          ▲
        </button>
      </div>
    </div>
  )
}
