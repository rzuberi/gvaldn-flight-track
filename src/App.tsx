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
  formatMonthLabel,
  formatShortDate,
  getMonthLeaders,
  hourOptions,
  londonAirports,
  weekdays,
  weekdayLabels,
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
  const monthLeaders = getMonthLeaders(candidates)
  const topResults = candidates.slice(0, 24)
  const cheapest = candidates[0]
  const medianPrice =
    candidates[Math.floor(candidates.length / 2)]?.price ?? cheapest?.price ?? 0

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

  const dateWindowLabel =
    candidates.length > 0
      ? `${formatDateLong(candidates[0].outboundDate)} to ${formatDateLong(candidates[candidates.length - 1].inboundDate)}`
      : 'No matching trips'

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">GVA / London direct tracker</p>
          <h1>Pick the days and hours you like, then jump to direct airline links.</h1>
          <p className="hero-text">
            This version only models <strong>direct flights</strong>. You can now
            choose acceptable outbound days, acceptable return days, an outbound
            departure window, and a return arrival window. Routes can mix
            airlines, so you might leave on <strong>easyJet</strong> and come back
            on <strong>SWISS</strong>.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card accent-card">
            <span className="stat-label">Direction</span>
            <strong>{directionLabels[direction]}</strong>
            <span className="stat-footnote">Switchable below</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Date window</span>
            <strong>{dateWindowLabel}</strong>
            <span className="stat-footnote">Rolling 12 months from today</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Current cheapest</span>
            <strong>{cheapest ? `GBP ${cheapest.price}` : 'No matches'}</strong>
            <span className="stat-footnote">
              {cheapest
                ? `${cheapest.routeCode} · ${formatDateRange(cheapest)}`
                : 'Adjust filters'}
            </span>
          </div>
        </div>
      </section>

      <section className="status-banner">
        <p>
          <strong>Current mode:</strong> direct-flight demo rankings with airline-first
          links where possible. Exact live airline booking deeplinks still need a
          server-side fare/search integration.
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

        <div className="control-grid">
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

        <div className="control-grid">
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
        </div>

        <div className="control-group">
          <span className="control-label">London airports</span>
          <div className="chip-set">
            {londonAirports.map((airportCode) => (
              <button
                className={
                  selectedAirports.includes(airportCode) ? 'chip is-active' : 'chip'
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

        <div className="control-group inline-group">
          <div className="static-note">Direct flights only</div>
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
          <span className="summary-label">Direct combinations</span>
          <strong>{candidates.length}</strong>
          <p>
            {outboundDays.length} outbound day
            {outboundDays.length === 1 ? '' : 's'} and {returnDays.length} return day
            {returnDays.length === 1 ? '' : 's'}
          </p>
        </article>

        <article className="summary-card">
          <span className="summary-label">Median ranked fare</span>
          <strong>GBP {medianPrice}</strong>
          <p>Across the current day and time filters.</p>
        </article>

        <article className="summary-card">
          <span className="summary-label">Time windows</span>
          <strong>
            {formatHourLabel(outboundStartHour)} to {formatHourLabel(outboundEndHour)}
          </strong>
          <p>
            Outbound departure, then return arrival {formatHourLabel(returnStartHour)} to{' '}
            {formatHourLabel(returnEndHour)}.
          </p>
        </article>
      </section>

      <section className="months-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Month leaders</p>
            <h2>Best direct option in each upcoming month</h2>
          </div>
          <p className="section-note">
            A fast scan of which months are worth checking first.
          </p>
        </div>

        <div className="month-grid">
          {monthLeaders.map((flight) => (
            <article className="month-card" key={flight.id}>
              <span className="month-label">{formatMonthLabel(flight.outboundDate)}</span>
              <strong>{flight.routeCode}</strong>
              <p>{formatDateRange(flight)}</p>
              <p>{buildAirlineSummary(flight)}</p>
              <div className="month-meta">
                <span>GBP {flight.price}</span>
                <span>{flight.stayLengthLabel}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="results-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Ranked results</p>
            <h2>Top direct picks to verify now</h2>
          </div>
          <p className="section-note">
            Airline-first links appear before Skyscanner and KAYAK.
          </p>
        </div>

        {topResults.length === 0 ? (
          <div className="empty-state">
            No direct options match the current weekday and hour filters. Widen the
            departure or return window and try again.
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
  return (
    <article className="result-card">
      <div className="rank-badge">#{index + 1}</div>

      <div className="result-header">
        <div>
          <p className="result-reference">{flight.referenceCode}</p>
          <h3>{flight.routeTitle}</h3>
          <p className="result-subtitle">
            {formatDateRange(flight)} · {flight.stayLengthLabel} ·{' '}
            {buildAirlineSummary(flight)}
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
          <dt>Outbound leg</dt>
          <dd>
            {formatShortDate(flight.outboundDate)} · {flight.outbound.flightCode} ·{' '}
            {flight.outbound.airlineName}
          </dd>
        </div>
        <div>
          <dt>Leave time</dt>
          <dd>
            {flight.outbound.departureLabel} to {flight.outbound.arrivalLabel}
          </dd>
        </div>
        <div>
          <dt>Return leg</dt>
          <dd>
            {formatShortDate(flight.inboundDate)} · {flight.inbound.flightCode} ·{' '}
            {flight.inbound.airlineName}
          </dd>
        </div>
        <div>
          <dt>Return timing</dt>
          <dd>
            {flight.inbound.departureLabel} to {flight.inbound.arrivalLabel}
          </dd>
        </div>
        <div>
          <dt>Airport pair</dt>
          <dd>
            {flight.origin} to {flight.destination}
          </dd>
        </div>
        <div>
          <dt>Total flight time</dt>
          <dd>{flight.totalFlightLabel}</dd>
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

      <div className="lookup-group">
        <div className="lookup-section">
          <span className="control-label">Official airline links</span>
          <div className="lookup-bar">
            {flight.outbound.officialUrl && (
              <a href={flight.outbound.officialUrl} rel="noreferrer" target="_blank">
                Outbound: {flight.outbound.officialLabel}
              </a>
            )}
            {flight.inbound.officialUrl && (
              <a href={flight.inbound.officialUrl} rel="noreferrer" target="_blank">
                Return: {flight.inbound.officialLabel}
              </a>
            )}
          </div>
        </div>

        <div className="lookup-section">
          <span className="control-label">Cross-check links</span>
          <div className="lookup-bar">
            <a href={buildSkyscannerUrl(flight)} rel="noreferrer" target="_blank">
              Skyscanner
            </a>
            <a href={buildKayakUrl(flight)} rel="noreferrer" target="_blank">
              KAYAK
            </a>
            <a href={buildGoogleSearchUrl(flight)} rel="noreferrer" target="_blank">
              Google search
            </a>
            <button onClick={() => onCopy(flight)} type="button">
              {copiedId === flight.id ? 'Copied' : 'Copy search text'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default App
