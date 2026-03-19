export type Direction = 'gva-to-london' | 'london-to-gva'
export type WeekendPattern = 'thu-sun' | 'fri-sun'
export type SortMode = 'best-value' | 'cheapest' | 'fastest'

export type FlightCandidate = {
  id: string
  direction: Direction
  origin: string
  destination: string
  outboundDate: Date
  inboundDate: Date
  outboundTime: string
  inboundTime: string
  pattern: WeekendPattern
  patternLabel: string
  airline: string
  stops: number
  stopsLabel: string
  durationMinutes: number
  durationLabel: string
  price: number
  rankScore: number
  routeCode: string
  routeTitle: string
  lookupAirportName: string
  referenceCode: string
  highlights: string[]
}

type AirportProfile = {
  code: string
  city: string
  name: string
  airlines: string[]
  priceBase: number
  directBias: number
  comfortBias: number
}

type BuildConfig = {
  direction: Direction
  sortMode: SortMode
  patterns: WeekendPattern[]
  airports: string[]
  directOnly: boolean
}

const dayMs = 24 * 60 * 60 * 1000

export const directionLabels: Record<Direction, string> = {
  'gva-to-london': 'GVA to any London airport',
  'london-to-gva': 'London airport to GVA',
}

const airportProfiles: AirportProfile[] = [
  {
    code: 'LHR',
    city: 'London',
    name: 'Heathrow',
    airlines: ['British Airways', 'SWISS'],
    priceBase: 118,
    directBias: 0.92,
    comfortBias: 0.92,
  },
  {
    code: 'LGW',
    city: 'London',
    name: 'Gatwick',
    airlines: ['easyJet', 'British Airways'],
    priceBase: 86,
    directBias: 0.89,
    comfortBias: 0.7,
  },
  {
    code: 'LCY',
    city: 'London',
    name: 'City',
    airlines: ['British Airways', 'BA Cityflyer'],
    priceBase: 144,
    directBias: 0.81,
    comfortBias: 0.98,
  },
  {
    code: 'LTN',
    city: 'London',
    name: 'Luton',
    airlines: ['easyJet', 'Wizz Air'],
    priceBase: 74,
    directBias: 0.86,
    comfortBias: 0.48,
  },
  {
    code: 'STN',
    city: 'London',
    name: 'Stansted',
    airlines: ['easyJet', 'Ryanair'],
    priceBase: 79,
    directBias: 0.63,
    comfortBias: 0.44,
  },
  {
    code: 'SEN',
    city: 'London',
    name: 'Southend',
    airlines: ['easyJet', 'Multiple airlines'],
    priceBase: 95,
    directBias: 0.2,
    comfortBias: 0.4,
  },
]

export const airportDetails = Object.fromEntries(
  airportProfiles.map((profile) => [profile.code, profile]),
) as Record<string, AirportProfile>

export const londonAirports = airportProfiles.map((profile) => profile.code)

const seasonalityByMonth = [18, 8, 0, -8, -12, 10, 34, 42, 18, 4, 2, 20]

export function buildFlightCandidates(config: BuildConfig): FlightCandidate[] {
  const windows = buildWeekendWindows()
  const candidates: FlightCandidate[] = []

  for (const window of windows) {
    if (!config.patterns.includes(window.pattern)) {
      continue
    }

    for (const airportCode of config.airports) {
      const profile = airportDetails[airportCode]

      if (!profile) {
        continue
      }

      const origin = config.direction === 'gva-to-london' ? 'GVA' : airportCode
      const destination =
        config.direction === 'gva-to-london' ? airportCode : 'GVA'
      const seed = hashString(
        [
          config.direction,
          airportCode,
          window.pattern,
          toIsoDate(window.outboundDate),
          toIsoDate(window.inboundDate),
        ].join('|'),
      )

      const direct = isDirect(seed, profile.directBias)

      if (config.directOnly && !direct) {
        continue
      }

      const airline = pick(profile.airlines, seed)
      const stops = direct ? 0 : 1
      const price = buildPrice({
        direct,
        outboundDate: window.outboundDate,
        pattern: window.pattern,
        profile,
        seed,
      })
      const durationMinutes = buildDurationMinutes({
        direct,
        profile,
        seed,
      })
      const rankScore = buildRankScore({
        comfortBias: profile.comfortBias,
        direct,
        durationMinutes,
        pattern: window.pattern,
        price,
        sortMode: config.sortMode,
      })
      const outboundTime = buildDepartureTime(seed, true)
      const inboundTime = buildDepartureTime(seed, false)
      const routeCode = `${origin}-${destination}`
      const routeTitle =
        config.direction === 'gva-to-london'
          ? `${origin} to ${profile.city} ${profile.name}`
          : `${origin} to ${destination}`
      const referenceCode = `${routeCode} · ${toIsoDate(window.outboundDate)} → ${toIsoDate(window.inboundDate)}`

      candidates.push({
        id: `${routeCode}-${toIsoDate(window.outboundDate)}-${window.pattern}`,
        direction: config.direction,
        origin,
        destination,
        outboundDate: window.outboundDate,
        inboundDate: window.inboundDate,
        outboundTime,
        inboundTime,
        pattern: window.pattern,
        patternLabel: window.pattern === 'thu-sun' ? 'Thu to Sun' : 'Fri to Sun',
        airline,
        stops,
        stopsLabel: direct ? 'Direct' : '1 stop',
        durationMinutes,
        durationLabel: formatDuration(durationMinutes),
        price,
        rankScore,
        routeCode,
        routeTitle,
        lookupAirportName: profile.name,
        referenceCode,
        highlights: buildHighlights({
          comfortBias: profile.comfortBias,
          direct,
          pattern: window.pattern,
          price,
          profile,
        }),
      })
    }
  }

  return candidates.sort((left, right) => {
    if (left.rankScore !== right.rankScore) {
      return left.rankScore - right.rankScore
    }

    if (left.price !== right.price) {
      return left.price - right.price
    }

    return left.outboundDate.getTime() - right.outboundDate.getTime()
  })
}

export function getMonthLeaders(candidates: FlightCandidate[]) {
  const leaders = new Map<string, FlightCandidate>()

  for (const candidate of candidates) {
    const key = `${candidate.outboundDate.getUTCFullYear()}-${candidate.outboundDate.getUTCMonth()}`

    if (!leaders.has(key)) {
      leaders.set(key, candidate)
    }
  }

  return [...leaders.values()].slice(0, 12)
}

export function buildSkyscannerUrl(flight: FlightCandidate) {
  const params = new URLSearchParams({
    origin: flight.origin,
    destination: flight.destination,
    outboundDate: toIsoDate(flight.outboundDate),
    inboundDate: toIsoDate(flight.inboundDate),
    adultsv2: '1',
    cabinclass: 'economy',
    preferDirects: String(flight.stops === 0),
    outboundaltsenabled: 'false',
    inboundaltsenabled: 'false',
    market: 'UK',
    locale: 'en-GB',
    currency: 'GBP',
  })

  return `https://skyscanner.net/g/referrals/v1/flights/day-view/?${params.toString()}`
}

export function buildKayakUrl(flight: FlightCandidate) {
  return `https://www.kayak.co.uk/flights/${flight.origin}-${flight.destination}/${toIsoDate(flight.outboundDate)}/${toIsoDate(flight.inboundDate)}?sort=bestflight_a`
}

export function buildGoogleSearchUrl(flight: FlightCandidate) {
  const query = buildSearchPrompt(flight)
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

export function buildSearchPrompt(flight: FlightCandidate) {
  return `${flight.origin} ${flight.destination} return flight ${toIsoDate(flight.outboundDate)} ${toIsoDate(flight.inboundDate)} ${flight.airline} ${flight.stopsLabel}`
}

export function formatDateLong(date: Date) {
  return longDateFormatter.format(date)
}

export function formatShortDate(date: Date) {
  return shortDateFormatter.format(date)
}

export function formatMonthLabel(date: Date) {
  return monthFormatter.format(date)
}

export function formatDateRange(flight: FlightCandidate) {
  return `${formatShortDate(flight.outboundDate)} to ${formatShortDate(flight.inboundDate)}`
}

function buildWeekendWindows() {
  const windows: { inboundDate: Date; outboundDate: Date; pattern: WeekendPattern }[] = []
  const start = todayUtc()
  const end = addMonthsUtc(start, 12)

  for (
    let cursor = start;
    cursor.getTime() < end.getTime();
    cursor = addDays(cursor, 1)
  ) {
    const day = cursor.getUTCDay()

    if (day === 4) {
      windows.push({
        outboundDate: cursor,
        inboundDate: addDays(cursor, 3),
        pattern: 'thu-sun',
      })
    }

    if (day === 5) {
      windows.push({
        outboundDate: cursor,
        inboundDate: addDays(cursor, 2),
        pattern: 'fri-sun',
      })
    }
  }

  return windows
}

function buildPrice(input: {
  direct: boolean
  outboundDate: Date
  pattern: WeekendPattern
  profile: AirportProfile
  seed: number
}) {
  const monthPenalty = seasonalityByMonth[input.outboundDate.getUTCMonth()]
  const directPremium = input.direct ? 16 : -8
  const weekendPremium = input.pattern === 'fri-sun' ? 14 : 0
  const volatility = (input.seed % 61) - 18
  const shoulderSeasonBonus = input.outboundDate.getUTCMonth() === 4 ? -8 : 0
  const roughPrice =
    input.profile.priceBase +
    monthPenalty +
    directPremium +
    weekendPremium +
    volatility +
    shoulderSeasonBonus

  return clampAndRoundPrice(roughPrice)
}

function buildDurationMinutes(input: {
  direct: boolean
  profile: AirportProfile
  seed: number
}) {
  if (input.direct) {
    return 82 + Math.round((1 - input.profile.comfortBias) * 16) + (input.seed % 22)
  }

  return 194 + (input.seed % 138)
}

function buildRankScore(input: {
  comfortBias: number
  direct: boolean
  durationMinutes: number
  pattern: WeekendPattern
  price: number
  sortMode: SortMode
}) {
  const stopPenalty = input.direct ? 0 : 72
  const durationPenalty = Math.round(Math.max(input.durationMinutes - 95, 0) * 0.28)
  const comfortPenalty = Math.round((1 - input.comfortBias) * 28)
  const fridayPenalty = input.pattern === 'fri-sun' ? 10 : 0

  if (input.sortMode === 'cheapest') {
    return input.price + stopPenalty + Math.round(durationPenalty * 0.25)
  }

  if (input.sortMode === 'fastest') {
    return input.durationMinutes + stopPenalty + Math.round(input.price * 0.15)
  }

  return input.price + stopPenalty + durationPenalty + comfortPenalty + fridayPenalty
}

function buildHighlights(input: {
  comfortBias: number
  direct: boolean
  pattern: WeekendPattern
  price: number
  profile: AirportProfile
}) {
  const highlights: string[] = []

  if (input.price <= 95) {
    highlights.push('Low fare')
  }

  if (input.direct) {
    highlights.push('Direct')
  }

  if (input.profile.code === 'LCY' || input.profile.code === 'LHR') {
    highlights.push('Stronger airport')
  }

  if (input.pattern === 'thu-sun') {
    highlights.push('Longer weekend')
  }

  if (highlights.length === 0) {
    highlights.push('Worth checking')
  }

  return highlights
}

function buildDepartureTime(seed: number, outbound: boolean) {
  const baseHour = outbound ? 6 : 14
  const hour = baseHour + ((seed >> (outbound ? 1 : 3)) % 8)
  const minute = ((seed >> (outbound ? 6 : 9)) % 2) * 30

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function isDirect(seed: number, directBias: number) {
  return (seed % 1000) / 1000 < directBias
}

function pick<T>(values: T[], seed: number) {
  return values[seed % values.length]
}

function clampAndRoundPrice(value: number) {
  const bounded = Math.max(52, Math.min(310, value))
  return Math.round(bounded / 5) * 5
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function todayUtc() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * dayMs)
}

function addMonthsUtc(date: Date, months: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()),
  )
}

function toIsoDate(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

const longDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
})

const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
  weekday: 'short',
})

const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
})
