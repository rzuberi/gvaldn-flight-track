import { type CSSProperties, useState } from 'react'
import './App.css'
import {
  buildFlightCandidates,
  buildSearchPrompt,
  directionLabels,
  formatDateLong,
  formatHourLabel,
  formatMonthLabel,
  hourOptions,
  londonAirports,
  weekdayLabels,
  weekdays,
  type Direction,
  type FlightCandidate,
  type SortMode,
  type Weekday,
} from './lib/flight-data'

const allSorts: SortMode[] = ['cheapest', 'date']
const defaultOutboundDays: Weekday[] = ['thu', 'fri']
const defaultReturnDays: Weekday[] = ['sun']
const monthLimit = 8

function App() {
  const [direction, setDirection] = useState<Direction>('gva-to-london')
  const [sortMode, setSortMode] = useState<SortMode>('cheapest')
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

  const monthSections = groupFlightsByMonth(candidates, monthLimit)
  const visibleCount = monthSections.reduce(
    (total, section) => total + section.flights.length,
    0,
  )
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
      <section className="page-header">
        <p className="kicker">GVA ⇄ London direct tracker</p>
        <h1>Direct weekend flights for the next 12 months</h1>
        <p className="lead">
          Compare the direct options quickly, then keep the ones worth checking.
        </p>
      </section>

      <section className="filters-panel">
        <div className="filters-grid">
          <div className="control-group span-two">
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
            <span className="control-label">Return arrival</span>
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

          <div className="control-group span-two">
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
        </div>

        <p className="filter-summary">
          {directionLabels[direction]} · Leave {formatDaySet(outboundDays)} · Return{' '}
          {formatDaySet(returnDays)} · Outbound {formatHourLabel(outboundStartHour)} to{' '}
          {formatHourLabel(outboundEndHour)} · Return arrives {formatHourLabel(returnStartHour)}{' '}
          to {formatHourLabel(returnEndHour)} · {selectedAirports.join(', ')}
        </p>
      </section>

      <section className="results-panel">
        <div className="results-header">
          <div>
            <p className="kicker">Results</p>
            <h2>{visibleCount} trips on screen</h2>
            <p className="results-note">
              Sorted across the full list by {sortMode === 'cheapest' ? 'price' : 'date'}.
              Showing up to {monthLimit} trips per month. {dateWindowLabel}
            </p>
            <p className="prototype-note">
              This page rebuilds every 6 hours. Times and prices are still indicative
              until a live fare source is connected.
            </p>
          </div>

          <label className="sort-field">
            <span className="control-label">Sort</span>
            <select
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              value={sortMode}
            >
              {allSorts.map((option) => (
                <option key={option} value={option}>
                  {option === 'cheapest' ? 'Cheapest' : 'Date'}
                </option>
              ))}
            </select>
          </label>
        </div>

        {monthSections.length === 0 ? (
          <div className="empty-state">
            No direct options match the current filters. Widen the time windows or add
            more weekdays.
          </div>
        ) : (
          <div className="month-sections">
            {monthSections.map((section) => (
              <section className="month-section" key={section.key}>
                <header className="month-header">
                  <h3>{section.label}</h3>
                  <p>{section.flights.length} trips</p>
                </header>

                <div className="month-grid">
                  {section.flights.map((flight) => (
                    <FlightCard
                      copiedId={copiedId}
                      flight={flight}
                      key={flight.id}
                      onCopy={copySearch}
                    />
                  ))}
                </div>
              </section>
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
  onCopy: (flight: FlightCandidate) => void
}

type MonthSection = {
  flights: FlightCandidate[]
  key: string
  label: string
}

function FlightCard({ copiedId, flight, onCopy }: FlightCardProps) {
  return (
    <article className="flight-card">
      <div className="flight-card-head">
        <div>
          <p className="route-line">{flight.routeTitle}</p>
          <h4>
            {formatCardDay(flight.outboundDate)} / {formatCardDay(flight.inboundDate)}
          </h4>
        </div>

        <div className="price-box">
          <strong>GBP {flight.price}</strong>
        </div>
      </div>

      <div className="date-strip">
        <div className="date-block">
          <span className="date-label">Leave</span>
          <strong>{formatCardDate(flight.outboundDate)}</strong>
          <span className="route-direction">
            {flight.origin} to {flight.destination}
          </span>
          <span
            className="time-badge"
            style={getTimeToneStyle(flight.outbound.departureMinutes)}
          >
            {flight.outbound.departureLabel} to {flight.outbound.arrivalLabel}
          </span>
          <span className={`airline-name airline-${flight.outbound.airlineId}`}>
            {flight.outbound.airlineName}
          </span>
        </div>

        <div className="date-block">
          <span className="date-label">Return</span>
          <strong>{formatCardDate(flight.inboundDate)}</strong>
          <span className="route-direction">
            {flight.destination} to {flight.origin}
          </span>
          <span
            className="time-badge"
            style={getTimeToneStyle(flight.inbound.departureMinutes)}
          >
            {flight.inbound.departureLabel} to {flight.inbound.arrivalLabel}
          </span>
          <span className={`airline-name airline-${flight.inbound.airlineId}`}>
            {flight.inbound.airlineName}
          </span>
        </div>
      </div>

      <div className="card-footer">
        <button className="copy-button" onClick={() => onCopy(flight)} type="button">
          {copiedId === flight.id ? 'Copied' : 'Copy search'}
        </button>
      </div>
    </article>
  )
}

function groupFlightsByMonth(candidates: FlightCandidate[], limit: number): MonthSection[] {
  const sections = new Map<string, { flights: FlightCandidate[]; label: string }>()

  for (const candidate of candidates) {
    const monthStart = Date.UTC(
      candidate.outboundDate.getUTCFullYear(),
      candidate.outboundDate.getUTCMonth(),
      1,
    )
    const key = String(monthStart)

    if (!sections.has(key)) {
      sections.set(key, {
        flights: [],
        label: formatMonthLabel(candidate.outboundDate),
      })
    }

    const section = sections.get(key)

    if (!section || section.flights.length >= limit) {
      continue
    }

    section.flights.push(candidate)
  }

  return [...sections.entries()].map(([key, section]) => ({
    flights: section.flights,
    key,
    label: section.label,
  }))
}

function formatDaySet(days: Weekday[]) {
  return days.map((day) => weekdayLabels[day]).join(', ')
}

function formatCardDay(date: Date) {
  return cardDayFormatter.format(date)
}

function formatCardDate(date: Date) {
  return cardDateFormatter.format(date)
}

function getTimeToneStyle(totalMinutes: number): CSSProperties {
  const hour = totalMinutes / 60
  const progress = clamp((hour - 5) / 18, 0, 1)
  const hue = 35 + progress * 185

  return {
    background: `linear-gradient(135deg, hsla(${hue}, 92%, 95%, 1), hsla(${hue}, 72%, 86%, 1))`,
    borderColor: `hsla(${hue}, 70%, 48%, 0.35)`,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const cardDayFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  timeZone: 'UTC',
  weekday: 'long',
})

const cardDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export default App
