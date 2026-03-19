import { useState } from 'react'
import './App.css'
import {
  buildAirlineSummary,
  buildFlightCandidates,
  buildGoogleSearchUrl,
  buildKayakUrl,
  buildSearchPrompt,
  buildSkyscannerUrl,
  directionLabels,
  formatDateLong,
  formatDateRange,
  formatHourLabel,
  formatShortDate,
  hourOptions,
  londonAirports,
  weekdayLabels,
  weekdays,
  type Direction,
  type FlightCandidate,
  type SortMode,
  type Weekday,
} from './lib/flight-data'

const allSorts: SortMode[] = ['best-value', 'cheapest', 'fastest']
const defaultOutboundDays: Weekday[] = ['thu', 'fri']
const defaultReturnDays: Weekday[] = ['sun']

function App() {
  const [direction, setDirection] = useState<Direction>('gva-to-london')
  const [sortMode, setSortMode] = useState<SortMode>('best-value')
  const [selectedAirports, setSelectedAirports] = useState<string[]>([
    ...londonAirports,
  ])
  const [outboundDays, setOutboundDays] = useState<Weekday[]>([
    ...defaultOutboundDays,
  ])
  const [returnDays, setReturnDays] = useState<Weekday[]>([...defaultReturnDays])
  const [outboundStartHour, setOutboundStartHour] = useState(6)
  const [outboundEndHour, setOutboundEndHour] = useState(13)
  const [returnStartHour, setReturnStartHour] = useState(15)
  const [returnEndHour, setReturnEndHour] = useState(23)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const candidates = buildFlightCandidates({
    airports: selectedAirports,
    direction,
    inboundArrivalEndHour: returnEndHour,
    inboundArrivalStartHour: returnStartHour,
    outboundDays,
    outboundDepartureEndHour: outboundEndHour,
    outboundDepartureStartHour: outboundStartHour,
    returnDays,
    sortMode,
  })

  const topResults = candidates.slice(0, 24)
  const cheapest = candidates[0]
  const dateWindowLabel =
    candidates.length > 0
      ? `${formatDateLong(candidates[0].outboundDate)} to ${formatDateLong(candidates[candidates.length - 1].inboundDate)}`
      : 'No matching trips'

  const toggleWeekday = (
    day: Weekday,
    setValue: (updater: (value: Weekday[]) => Weekday[]) => void,
  ) => {
    setValue((existing) => {
      if (existing.includes(day)) {
        if (existing.length === 1) {
          return existing
        }

        return existing.filter((entry) => entry !== day)
      }

      return [...existing, day]
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
    try {
      await navigator.clipboard.writeText(buildSearchPrompt(flight))
      setCopiedId(flight.id)
      window.setTimeout(() => setCopiedId(null), 1800)
    } catch {
      setCopiedId(null)
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-panel compact-hero">
        <p className="eyebrow">GVA / London direct tracker</p>
        <h1>Find Direct Flights: Geneva ⇄ London</h1>
        <p className="hero-text compact-text">
          Filter by your preferred days and times. See direct options first, then
          open the clearest booking path for each itinerary.
        </p>
      </section>

      <section className="search-panel">
        <div className="primary-controls">
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
            <span className="control-label">Leave on</span>
            <div className="chip-set">
              {weekdays.map((day) => (
                <button
                  className={outboundDays.includes(day) ? 'chip is-active' : 'chip'}
                  key={day}
                  onClick={() => toggleWeekday(day, setOutboundDays)}
                  type="button"
                >
                  {weekdayLabels[day]}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <span className="control-label">Return on</span>
            <div className="chip-set">
              {weekdays.map((day) => (
                <button
                  className={returnDays.includes(day) ? 'chip is-active' : 'chip'}
                  key={day}
                  onClick={() => toggleWeekday(day, setReturnDays)}
                  type="button"
                >
                  {weekdayLabels[day]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <details className="advanced-panel">
          <summary>Advanced filters</summary>
          <div className="advanced-grid">
            <div className="control-group">
              <span className="control-label">Leave between</span>
              <div className="time-grid">
                <label className="time-field">
                  <span>From</span>
                  <select
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      setOutboundStartHour(next)
                      if (next >= outboundEndHour) {
                        setOutboundEndHour(next + 1)
                      }
                    }}
                    value={outboundStartHour}
                  >
                    {hourOptions
                      .filter((hour) => hour < outboundEndHour)
                      .map((hour) => (
                        <option key={hour} value={hour}>
                          {formatHourLabel(hour)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="time-field">
                  <span>To</span>
                  <select
                    onChange={(event) => setOutboundEndHour(Number(event.target.value))}
                    value={outboundEndHour}
                  >
                    {hourOptions
                      .filter((hour) => hour > outboundStartHour)
                      .map((hour) => (
                        <option key={hour} value={hour}>
                          {formatHourLabel(hour)}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="control-group">
              <span className="control-label">Return arrival between</span>
              <div className="time-grid">
                <label className="time-field">
                  <span>From</span>
                  <select
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      setReturnStartHour(next)
                      if (next >= returnEndHour) {
                        setReturnEndHour(next + 1)
                      }
                    }}
                    value={returnStartHour}
                  >
                    {hourOptions
                      .filter((hour) => hour < returnEndHour)
                      .map((hour) => (
                        <option key={hour} value={hour}>
                          {formatHourLabel(hour)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="time-field">
                  <span>To</span>
                  <select
                    onChange={(event) => setReturnEndHour(Number(event.target.value))}
                    value={returnEndHour}
                  >
                    {hourOptions
                      .filter((hour) => hour > returnStartHour)
                      .map((hour) => (
                        <option key={hour} value={hour}>
                          {formatHourLabel(hour)}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="control-group">
              <span className="control-label">London airports</span>
              <div className="chip-set">
                {londonAirports.map((airportCode) => (
                  <button
                    className={
                      selectedAirports.includes(airportCode)
                        ? 'chip is-active'
                        : 'chip'
                    }
                    key={airportCode}
                    onClick={() => toggleAirport(airportCode)}
                    type="button"
                  >
                    {airportCode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </details>
      </section>

      <section className="active-summary">
        <div>
          <span className="control-label">Active search</span>
          <strong>{directionLabels[direction]}</strong>
          <p>
            Leave {formatDaySet(outboundDays)} · Return {formatDaySet(returnDays)} ·
            Outbound {formatHourLabel(outboundStartHour)}-{formatHourLabel(outboundEndHour)} ·
            Return arrives {formatHourLabel(returnStartHour)}-{formatHourLabel(returnEndHour)}
          </p>
        </div>
        <div>
          <span className="control-label">Coverage</span>
          <strong>{candidates.length} direct options</strong>
          <p>
            {selectedAirports.length} airport{selectedAirports.length === 1 ? '' : 's'} ·{' '}
            {dateWindowLabel}
          </p>
        </div>
        <div>
          <span className="control-label">Best visible price</span>
          <strong>{cheapest ? `GBP ${cheapest.price}` : 'No matches'}</strong>
          <p>{cheapest ? `${cheapest.routeCode} · ${formatDateRange(cheapest)}` : 'Widen filters'}</p>
        </div>
      </section>

      <section className="results-panel">
        <div className="results-toolbar">
          <div>
            <p className="eyebrow">Results</p>
            <h2>{topResults.length} trips to check now</h2>
          </div>

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

        {topResults.length === 0 ? (
          <div className="empty-state">
            No direct options match the current filters. Widen the time windows or
            add more weekdays.
          </div>
        ) : (
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
        )}
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
  const primaryAction = getPrimaryAction(flight)

  return (
    <article className="result-card compact-card">
      <div className="card-topline">
        <span className="rank-badge">#{index + 1}</span>
        <span className="mini-label">{flight.routeCode}</span>
        <span className="mini-label">{flight.stayLengthLabel}</span>
        <span className="mini-label">Direct only</span>
      </div>

      <div className="result-core">
        <div className="result-main">
          <h3>{formatDateRange(flight)}</h3>
          <p className="result-subtitle">
            {flight.routeTitle} · {buildAirlineSummary(flight)}
          </p>
          <div className="leg-strip">
            <div className="leg-pill">
              <span className="leg-label">Out</span>
              <strong>{flight.outbound.departureLabel}</strong>
              <span>
                {flight.outbound.airlineName} · {flight.outbound.flightCode}
              </span>
            </div>
            <div className="leg-pill">
              <span className="leg-label">Back</span>
              <strong>{flight.inbound.arrivalLabel}</strong>
              <span>
                {flight.inbound.airlineName} · {flight.inbound.flightCode}
              </span>
            </div>
          </div>
        </div>

        <div className="price-box compact-price">
          <span className="price-label">Return fare</span>
          <strong>GBP {flight.price}</strong>
          <span className="price-footnote">{flight.totalFlightLabel}</span>
        </div>
      </div>

      <div className="result-actions">
        <a
          className="primary-action"
          href={primaryAction.url}
          rel="noreferrer"
          target="_blank"
        >
          {primaryAction.label}
        </a>
        <button className="secondary-action" onClick={() => onCopy(flight)} type="button">
          {copiedId === flight.id ? 'Copied' : 'Copy search'}
        </button>
      </div>

      <details className="result-details">
        <summary>Trip details</summary>

        <div className="chip-row result-chip-row">
          {flight.highlights.map((highlight) => (
            <span className="info-chip" key={highlight}>
              {highlight}
            </span>
          ))}
        </div>

        <dl className="facts-grid compact-facts">
          <div>
            <dt>Outbound leg</dt>
            <dd>
              {formatShortDate(flight.outboundDate)} · {flight.outbound.departureLabel} to{' '}
              {flight.outbound.arrivalLabel}
            </dd>
          </div>
          <div>
            <dt>Return leg</dt>
            <dd>
              {formatShortDate(flight.inboundDate)} · {flight.inbound.departureLabel} to{' '}
              {flight.inbound.arrivalLabel}
            </dd>
          </div>
          <div>
            <dt>Flight codes</dt>
            <dd>
              {flight.outbound.flightCode} / {flight.inbound.flightCode}
            </dd>
          </div>
          <div>
            <dt>Search prompt</dt>
            <dd>{buildSearchPrompt(flight)}</dd>
          </div>
        </dl>

        <div className="lookup-group">
          <div className="lookup-section">
            <span className="control-label">Booking links</span>
            <div className="lookup-bar">
              {flight.outbound.officialUrl && (
                <a href={flight.outbound.officialUrl} rel="noreferrer" target="_blank">
                  Book on {flight.outbound.officialLabel}
                </a>
              )}
              {flight.inbound.officialUrl && (
                <a href={flight.inbound.officialUrl} rel="noreferrer" target="_blank">
                  Return on {flight.inbound.officialLabel}
                </a>
              )}
              <a href={buildSkyscannerUrl(flight)} rel="noreferrer" target="_blank">
                Skyscanner
              </a>
              <a href={buildKayakUrl(flight)} rel="noreferrer" target="_blank">
                KAYAK
              </a>
              <a href={buildGoogleSearchUrl(flight)} rel="noreferrer" target="_blank">
                Google search
              </a>
            </div>
          </div>
        </div>
      </details>
    </article>
  )
}

function formatDaySet(days: Weekday[]) {
  return days.map((day) => weekdayLabels[day]).join(', ')
}

function getPrimaryAction(flight: FlightCandidate) {
  if (
    flight.outbound.airlineName === flight.inbound.airlineName &&
    flight.outbound.officialUrl &&
    flight.outbound.officialUrl === flight.inbound.officialUrl
  ) {
    return {
      label: `Book on ${flight.outbound.airlineName}`,
      url: flight.outbound.officialUrl,
    }
  }

  if (flight.outbound.officialUrl && flight.outbound.airlineName !== flight.inbound.airlineName) {
    return {
      label: `Start with ${flight.outbound.airlineName}`,
      url: flight.outbound.officialUrl,
    }
  }

  if (flight.outbound.officialUrl) {
    return {
      label: `Book on ${flight.outbound.airlineName}`,
      url: flight.outbound.officialUrl,
    }
  }

  return {
    label: 'View itinerary',
    url: buildGoogleSearchUrl(flight),
  }
}

export default App
