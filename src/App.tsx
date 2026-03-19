import { useState } from 'react'
import './App.css'
import {
  buildFlightCandidates,
  buildGoogleSearchUrl,
  buildKayakUrl,
  buildSearchPrompt,
  buildSkyscannerUrl,
  directionLabels,
  formatDateLong,
  formatDateRange,
  formatMonthLabel,
  formatShortDate,
  getMonthLeaders,
  londonAirports,
  type Direction,
  type FlightCandidate,
  type SortMode,
  type WeekendPattern,
} from './lib/flight-data'

const allPatterns: WeekendPattern[] = ['thu-sun', 'fri-sun']
const allSorts: SortMode[] = ['best-value', 'cheapest', 'fastest']

function App() {
  const [direction, setDirection] = useState<Direction>('gva-to-london')
  const [sortMode, setSortMode] = useState<SortMode>('best-value')
  const [selectedPatterns, setSelectedPatterns] =
    useState<WeekendPattern[]>(allPatterns)
  const [selectedAirports, setSelectedAirports] = useState<string[]>([
    ...londonAirports,
  ])
  const [directOnly, setDirectOnly] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const candidates = buildFlightCandidates({
    direction,
    sortMode,
    patterns: selectedPatterns,
    airports: selectedAirports,
    directOnly,
  })
  const monthLeaders = getMonthLeaders(candidates)
  const topResults = candidates.slice(0, 24)
  const cheapest = candidates[0]
  const medianPrice =
    candidates[Math.floor(candidates.length / 2)]?.price ?? cheapest?.price ?? 0

  const togglePattern = (pattern: WeekendPattern) => {
    setSelectedPatterns((current) => {
      if (current.includes(pattern)) {
        if (current.length === 1) {
          return current
        }
        return current.filter((entry) => entry !== pattern)
      }

      return [...current, pattern]
    })
  }

  const toggleAirport = (airportCode: string) => {
    setSelectedAirports((current) => {
      if (current.includes(airportCode)) {
        if (current.length === 1) {
          return current
        }
        return current.filter((entry) => entry !== airportCode)
      }

      return [...current, airportCode]
    })
  }

  const copySearch = async (flight: FlightCandidate) => {
    const text = buildSearchPrompt(flight)

    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(flight.id)
      window.setTimeout(() => setCopiedId(null), 1800)
    } catch {
      setCopiedId(null)
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">GVA / London weekend tracker</p>
          <h1>Rank the next 12 months of weekend flights, then jump straight to lookup links.</h1>
          <p className="hero-text">
            This first release scans every upcoming <strong>Thursday to Sunday</strong>{' '}
            and <strong>Friday to Sunday</strong> weekend in the next 12 months,
            ranks the best route/date combinations, and makes each candidate easy
            to verify on Skyscanner, KAYAK, or a quick Google flight search.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card accent-card">
            <span className="stat-label">Direction</span>
            <strong>{directionLabels[direction]}</strong>
            <span className="stat-footnote">Switchable in the controls below</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Date window</span>
            <strong>
              {formatDateLong(candidates[0]?.outboundDate ?? new Date())} to{' '}
              {formatDateLong(
                candidates[candidates.length - 1]?.inboundDate ?? new Date(),
              )}
            </strong>
            <span className="stat-footnote">Rolling 12-month view from today</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Current cheapest</span>
            <strong>{cheapest ? `GBP ${cheapest.price}` : 'No matches'}</strong>
            <span className="stat-footnote">
              {cheapest ? `${cheapest.routeCode} · ${formatDateRange(cheapest)}` : 'Adjust filters'}
            </span>
          </div>
        </div>
      </section>

      <section className="status-banner">
        <p>
          <strong>Current mode:</strong> ranked demo data with real lookup links.
          The pricing model is deterministic for planning and UI validation; the
          next backend step is wiring a live fare provider.
        </p>
      </section>

      <section className="controls-panel">
        <div className="control-group">
          <span className="control-label">Direction</span>
          <div className="segmented">
            <button
              className={direction === 'gva-to-london' ? 'is-active' : ''}
              onClick={() => setDirection('gva-to-london')}
              type="button"
            >
              GVA to London
            </button>
            <button
              className={direction === 'london-to-gva' ? 'is-active' : ''}
              onClick={() => setDirection('london-to-gva')}
              type="button"
            >
              London to GVA
            </button>
          </div>
        </div>

        <div className="control-group">
          <span className="control-label">Weekend pattern</span>
          <div className="chip-set">
            {allPatterns.map((pattern) => (
              <button
                key={pattern}
                className={selectedPatterns.includes(pattern) ? 'chip is-active' : 'chip'}
                onClick={() => togglePattern(pattern)}
                type="button"
              >
                {pattern === 'thu-sun' ? 'Thu to Sun' : 'Fri to Sun'}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <span className="control-label">London airports</span>
          <div className="chip-set">
            {londonAirports.map((airportCode) => (
              <button
                key={airportCode}
                className={
                  selectedAirports.includes(airportCode) ? 'chip is-active' : 'chip'
                }
                onClick={() => toggleAirport(airportCode)}
                type="button"
              >
                {airportCode}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group inline-group">
          <label className="checkbox-row">
            <input
              checked={directOnly}
              onChange={(event) => setDirectOnly(event.target.checked)}
              type="checkbox"
            />
            <span>Direct flights only</span>
          </label>

          <label className="sort-row">
            <span className="control-label">Sort</span>
            <select
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              value={sortMode}
            >
              {allSorts.map((option) => (
                <option key={option} value={option}>
                  {option === 'best-value'
                    ? 'Best value'
                    : option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <span className="summary-label">Weekend combinations</span>
          <strong>{candidates.length}</strong>
          <p>
            {selectedPatterns.length} pattern{selectedPatterns.length === 1 ? '' : 's'} across{' '}
            {selectedAirports.length} London airport
            {selectedAirports.length === 1 ? '' : 's'}
          </p>
        </article>

        <article className="summary-card">
          <span className="summary-label">Median ranked fare</span>
          <strong>GBP {medianPrice}</strong>
          <p>Useful anchor for spotting unusually cheap weekends.</p>
        </article>

        <article className="summary-card">
          <span className="summary-label">Reference format</span>
          <strong>Route + dates + carrier</strong>
          <p>Every card is designed to be searchable on external sites in one click.</p>
        </article>
      </section>

      <section className="months-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Month leaders</p>
            <h2>Best ranked weekend in each upcoming month</h2>
          </div>
          <p className="section-note">
            One fast view so you can decide which months deserve deeper checking.
          </p>
        </div>

        <div className="month-grid">
          {monthLeaders.map((flight) => (
            <article className="month-card" key={flight.id}>
              <span className="month-label">{formatMonthLabel(flight.outboundDate)}</span>
              <strong>{flight.routeCode}</strong>
              <p>{formatDateRange(flight)}</p>
              <p>{flight.airline}</p>
              <div className="month-meta">
                <span>GBP {flight.price}</span>
                <span>{flight.stopsLabel}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="results-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Ranked results</p>
            <h2>Top weekend picks to verify now</h2>
          </div>
          <p className="section-note">
            Sorted by{' '}
            {sortMode === 'best-value'
              ? 'best value'
              : sortMode === 'cheapest'
                ? 'lowest price'
                : 'shortest trip time'}
            .
          </p>
        </div>

        <div className="results-list">
          {topResults.map((flight, index) => (
            <FlightCard
              copiedId={copiedId}
              flight={flight}
              index={index}
              key={flight.id}
              onCopy={copySearch}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

type FlightCardProps = {
  copiedId: string | null
  flight: FlightCandidate
  index: number
  onCopy: (flight: FlightCandidate) => void
}

function FlightCard({ copiedId, flight, index, onCopy }: FlightCardProps) {
  return (
    <article className="result-card">
      <div className="rank-badge">#{index + 1}</div>

      <div className="result-header">
        <div>
          <p className="result-reference">{flight.referenceCode}</p>
          <h3>{flight.routeTitle}</h3>
          <p className="result-subtitle">
            {formatDateRange(flight)} · {flight.patternLabel} · {flight.airline} ·{' '}
            {flight.stopsLabel}
          </p>
        </div>

        <div className="price-box">
          <span className="price-label">Estimated return</span>
          <strong>GBP {flight.price}</strong>
          <span className="price-footnote">rank score {flight.rankScore}</span>
        </div>
      </div>

      <div className="chip-row result-chip-row">
        {flight.highlights.map((highlight) => (
          <span className="info-chip" key={highlight}>
            {highlight}
          </span>
        ))}
      </div>

      <dl className="facts-grid">
        <div>
          <dt>Outbound</dt>
          <dd>
            {formatShortDate(flight.outboundDate)} · {flight.outboundTime}
          </dd>
        </div>
        <div>
          <dt>Return</dt>
          <dd>
            {formatShortDate(flight.inboundDate)} · {flight.inboundTime}
          </dd>
        </div>
        <div>
          <dt>Airport pair</dt>
          <dd>
            {flight.origin} to {flight.destination}
          </dd>
        </div>
        <div>
          <dt>Trip time</dt>
          <dd>{flight.durationLabel}</dd>
        </div>
        <div>
          <dt>Lookup route</dt>
          <dd>{flight.lookupAirportName}</dd>
        </div>
        <div>
          <dt>Search prompt</dt>
          <dd>{buildSearchPrompt(flight)}</dd>
        </div>
      </dl>

      <div className="lookup-bar">
        <a href={buildSkyscannerUrl(flight)} rel="noreferrer" target="_blank">
          Open in Skyscanner
        </a>
        <a href={buildKayakUrl(flight)} rel="noreferrer" target="_blank">
          Open in KAYAK
        </a>
        <a href={buildGoogleSearchUrl(flight)} rel="noreferrer" target="_blank">
          Google search
        </a>
        <button onClick={() => onCopy(flight)} type="button">
          {copiedId === flight.id ? 'Copied' : 'Copy search text'}
        </button>
      </div>
    </article>
  )
}

export default App
