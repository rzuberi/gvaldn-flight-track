import { useState } from 'react'
import './App.css'
import {
  buildFlightCandidates,
  buildGoogleSearchUrl,
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

const allSorts: SortMode[] = ['best-value', 'cheapest', 'fastest']
const defaultOutboundDays: Weekday[] = ['thu', 'fri']
const defaultReturnDays: Weekday[] = ['sun']
const monthLimit = 8

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
        <h1>Direct weekend flights, month by month</h1>
        <p className="lead">
          Black-and-white, date-first layout. Open the airline links to verify the
          live schedule and exact operating flight.
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
              Showing up to {monthLimit} ranked trips per month across {monthSections.length}{' '}
              months. {dateWindowLabel}
            </p>
            <p className="prototype-note">
              Airline links are real route pages where available. Exact times and prices
              still need live verification.
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
                  {option === 'best-value'
                    ? 'Best value'
                    : option.charAt(0).toUpperCase() + option.slice(1)}
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

function FlightCard({ copiedId, flight, onCopy }: FlightCardProps) {
  const bookingActions = getBookingActions(flight)

  return (
    <article className="flight-card">
      <div className="flight-card-head">
        <div>
          <p className="route-line">{flight.routeTitle}</p>
          <h4>{formatCardDay(flight.outboundDate)}</h4>
          <p className="return-line">Return {formatCardDay(flight.inboundDate)}</p>
        </div>

        <div className="price-box">
          <span className="price-label">Indicative fare</span>
          <strong>GBP {flight.price}</strong>
          <span className="price-meta">{flight.totalFlightLabel}</span>
        </div>
      </div>

      <div className="date-strip">
        <div className="date-block">
          <span className="date-label">Leave</span>
          <strong>{formatCardDate(flight.outboundDate)}</strong>
          <span>
            {flight.origin} to {flight.destination}
          </span>
        </div>
        <div className="date-block">
          <span className="date-label">Return</span>
          <strong>{formatCardDate(flight.inboundDate)}</strong>
          <span>
            {flight.destination} to {flight.origin}
          </span>
        </div>
      </div>

      <div className="legs-table">
        <div className="leg-row">
          <span className="leg-name">Outbound</span>
          <strong>
            {flight.outbound.departureLabel} to {flight.outbound.arrivalLabel}
          </strong>
          <span>{flight.outbound.airlineName}</span>
        </div>
        <div className="leg-row">
          <span className="leg-name">Return</span>
          <strong>
            {flight.inbound.departureLabel} to {flight.inbound.arrivalLabel}
          </strong>
          <span>{flight.inbound.airlineName}</span>
        </div>
      </div>

      <div className="action-row">
        <div className="action-links">
          {bookingActions.map((action, index) => (
            <a
              className={index === 0 ? 'action-link is-primary' : 'action-link'}
              href={action.url}
              key={`${action.label}-${action.url}`}
              rel="noreferrer"
              target="_blank"
            >
              {action.label}
            </a>
          ))}
          <a
            className="action-link"
            href={buildGoogleSearchUrl(flight)}
            rel="noreferrer"
            target="_blank"
          >
            Google search
          </a>
        </div>

        <button className="copy-button" onClick={() => onCopy(flight)} type="button">
          {copiedId === flight.id ? 'Copied' : 'Copy search'}
        </button>
      </div>
    </article>
  )
}

function groupFlightsByMonth(candidates: FlightCandidate[], limit: number) {
  const sections = new Map<
    string,
    { flights: FlightCandidate[]; label: string; monthStart: number }
  >()

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
        label: formatMonthLabel(candidate.outboundDate).toUpperCase(),
        monthStart,
      })
    }

    const section = sections.get(key)

    if (!section || section.flights.length >= limit) {
      continue
    }

    section.flights.push(candidate)
  }

  return [...sections.entries()]
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([key, section]) => ({
      key,
      label: section.label,
      flights: [...section.flights].sort((left, right) => {
        if (left.outboundDate.getTime() !== right.outboundDate.getTime()) {
          return left.outboundDate.getTime() - right.outboundDate.getTime()
        }

        return left.price - right.price
      }),
      monthStart: section.monthStart,
    }))
}

function getBookingActions(flight: FlightCandidate) {
  const actions: { label: string; url: string }[] = []

  if (flight.outbound.officialUrl) {
    actions.push({
      label:
        flight.outbound.airlineName === flight.inbound.airlineName &&
        flight.outbound.officialUrl === flight.inbound.officialUrl
          ? `Open ${flight.outbound.airlineName}`
          : `Open ${flight.outbound.airlineName} outbound`,
      url: flight.outbound.officialUrl,
    })
  }

  if (
    flight.inbound.officialUrl &&
    flight.inbound.officialUrl !== flight.outbound.officialUrl
  ) {
    actions.push({
      label: `Open ${flight.inbound.airlineName} return`,
      url: flight.inbound.officialUrl,
    })
  }

  return actions
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
