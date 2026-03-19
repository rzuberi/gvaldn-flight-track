export type Direction = 'gva-to-london' | 'london-to-gva'
export type SortMode = 'best-value' | 'cheapest' | 'fastest'
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type AirlineId = 'easyjet' | 'ba' | 'swiss' | 'jet2'

export type FlightLeg = {
  airlineId: AirlineId
  airlineName: string
  arrivalLabel: string
  arrivalMinutes: number
  departureLabel: string
  departureMinutes: number
  durationMinutes: number
  flightCode: string
  officialLabel: string
  officialUrl: string | null
}

export type FlightCandidate = {
  id: string
  direction: Direction
  destination: string
  highlights: string[]
  inbound: FlightLeg
  inboundDate: Date
  lookupAirportName: string
  origin: string
  outbound: FlightLeg
  outboundDate: Date
  price: number
  rankScore: number
  referenceCode: string
  routeCode: string
  routeTitle: string
  stayLengthDays: number
  stayLengthLabel: string
  totalFlightMinutes: number
  totalFlightLabel: string
}

type AirportProfile = {
  code: string
  city: string
  comfortBias: number
  directCarriers: AirlineId[]
  name: string
  priceBase: number
  shortHaulMinutes: number
}

type AirlineProfile = {
  code: string
  label: string
  priceModifier: number
}

type BuildConfig = {
  airports: string[]
  direction: Direction
  inboundArrivalEndHour: number
  inboundArrivalStartHour: number
  outboundDays: Weekday[]
  outboundDepartureEndHour: number
  outboundDepartureStartHour: number
  returnDays: Weekday[]
  sortMode: SortMode
}

const dayMs = 24 * 60 * 60 * 1000

export const directionLabels: Record<Direction, string> = {
  'gva-to-london': 'GVA to London',
  'london-to-gva': 'London to GVA',
}

export const weekdays: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const weekdayLabels: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

export const hourOptions = Array.from({ length: 18 }, (_, index) => index + 5)

const airlineProfiles: Record<AirlineId, AirlineProfile> = {
  easyjet: {
    code: 'EZY',
    label: 'easyJet',
    priceModifier: -10,
  },
  ba: {
    code: 'BA',
    label: 'British Airways',
    priceModifier: 10,
  },
  swiss: {
    code: 'LX',
    label: 'SWISS',
    priceModifier: 18,
  },
  jet2: {
    code: 'LS',
    label: 'Jet2',
    priceModifier: -4,
  },
}

const airportProfiles: AirportProfile[] = [
  {
    code: 'LHR',
    city: 'London',
    comfortBias: 0.95,
    directCarriers: ['ba', 'swiss'],
    name: 'Heathrow',
    priceBase: 126,
    shortHaulMinutes: 102,
  },
  {
    code: 'LGW',
    city: 'London',
    comfortBias: 0.8,
    directCarriers: ['easyjet', 'ba'],
    name: 'Gatwick',
    priceBase: 88,
    shortHaulMinutes: 95,
  },
  {
    code: 'LCY',
    city: 'London',
    comfortBias: 0.98,
    directCarriers: ['ba'],
    name: 'City',
    priceBase: 142,
    shortHaulMinutes: 100,
  },
  {
    code: 'LTN',
    city: 'London',
    comfortBias: 0.55,
    directCarriers: ['easyjet'],
    name: 'Luton',
    priceBase: 76,
    shortHaulMinutes: 99,
  },
  {
    code: 'STN',
    city: 'London',
    comfortBias: 0.5,
    directCarriers: ['jet2'],
    name: 'Stansted',
    priceBase: 84,
    shortHaulMinutes: 109,
  },
  {
    code: 'SEN',
    city: 'London',
    comfortBias: 0.46,
    directCarriers: ['easyjet'],
    name: 'Southend',
    priceBase: 92,
    shortHaulMinutes: 101,
  },
]

export const airportDetails = Object.fromEntries(
  airportProfiles.map((profile) => [profile.code, profile]),
) as Record<string, AirportProfile>

export const londonAirports = airportProfiles.map((profile) => profile.code)

const seasonalityByMonth = [16, 10, 2, -6, -10, 8, 30, 36, 18, 5, 3, 22]

export function buildFlightCandidates(config: BuildConfig): FlightCandidate[] {
  const datePairs = buildDatePairs(config.outboundDays, config.returnDays)
  const candidates: FlightCandidate[] = []

  for (const pair of datePairs) {
    for (const airportCode of config.airports) {
      const airport = airportDetails[airportCode]

      if (!airport) {
        continue
      }

      const origin = config.direction === 'gva-to-london' ? 'GVA' : airportCode
      const destination = config.direction === 'gva-to-london' ? airportCode : 'GVA'
      const outboundCarrier = pickCarrier(
        airport.directCarriers,
        hashString(
          `${origin}|${destination}|${toIsoDate(pair.outboundDate)}|${toIsoDate(pair.inboundDate)}|outbound`,
        ),
      )
      const inboundCarrier = pickCarrier(
        airport.directCarriers,
        hashString(
          `${origin}|${destination}|${toIsoDate(pair.outboundDate)}|${toIsoDate(pair.inboundDate)}|inbound`,
        ),
      )

      const outboundLeg = buildLeg({
        airport,
        airportCode,
        carrier: outboundCarrier,
        date: pair.outboundDate,
        destination,
        direction: config.direction,
        legKind: 'outbound',
        origin,
      })
      const inboundLeg = buildLeg({
        airport,
        airportCode,
        carrier: inboundCarrier,
        date: pair.inboundDate,
        destination: origin,
        direction: config.direction === 'gva-to-london' ? 'london-to-gva' : 'gva-to-london',
        legKind: 'inbound',
        origin,
      })

      if (
        !isHourInRange(
          Math.floor(outboundLeg.departureMinutes / 60),
          config.outboundDepartureStartHour,
          config.outboundDepartureEndHour,
        ) ||
        !isHourInRange(
          Math.floor(inboundLeg.arrivalMinutes / 60),
          config.inboundArrivalStartHour,
          config.inboundArrivalEndHour,
        )
      ) {
        continue
      }

      const price = buildPrice({
        airport,
        inboundCarrier,
        inboundDate: pair.inboundDate,
        outboundCarrier,
        outboundDate: pair.outboundDate,
        stayLengthDays: pair.stayLengthDays,
      })
      const totalFlightMinutes =
        outboundLeg.durationMinutes + inboundLeg.durationMinutes
      const rankScore = buildRankScore({
        airport,
        inboundArrivalMinutes: inboundLeg.arrivalMinutes,
        outboundDepartureMinutes: outboundLeg.departureMinutes,
        price,
        sortMode: config.sortMode,
        stayLengthDays: pair.stayLengthDays,
        totalFlightMinutes,
      })
      const routeCode = `${origin}-${destination}`
      const routeTitle =
        config.direction === 'gva-to-london'
          ? `${origin} to ${airport.city} ${airport.name}`
          : `${airport.city} ${airport.name} to ${destination}`
      const highlights = buildHighlights({
        airport,
        inboundCarrier,
        outboundCarrier,
        price,
        stayLengthDays: pair.stayLengthDays,
      })
      const referenceCode =
        `${routeCode} · ${toIsoDate(pair.outboundDate)} → ${toIsoDate(pair.inboundDate)} · ` +
        `${outboundLeg.flightCode} / ${inboundLeg.flightCode}`

      candidates.push({
        id: `${routeCode}-${toIsoDate(pair.outboundDate)}-${toIsoDate(pair.inboundDate)}-${outboundCarrier}-${inboundCarrier}`,
        direction: config.direction,
        destination,
        highlights,
        inbound: inboundLeg,
        inboundDate: pair.inboundDate,
        lookupAirportName: airport.name,
        origin,
        outbound: outboundLeg,
        outboundDate: pair.outboundDate,
        price,
        rankScore,
        referenceCode,
        routeCode,
        routeTitle,
        stayLengthDays: pair.stayLengthDays,
        stayLengthLabel: `${pair.stayLengthDays} day${pair.stayLengthDays === 1 ? '' : 's'}`,
        totalFlightMinutes,
        totalFlightLabel: formatDuration(totalFlightMinutes),
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
    preferDirects: 'true',
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
  return `https://www.google.com/search?q=${encodeURIComponent(buildSearchPrompt(flight))}`
}

export function buildSearchPrompt(flight: FlightCandidate) {
  return [
    `${flight.origin} ${flight.destination} direct return flight`,
    toIsoDate(flight.outboundDate),
    toIsoDate(flight.inboundDate),
    `outbound ${flight.outbound.airlineName} ${flight.outbound.flightCode} ${flight.outbound.departureLabel}`,
    `return ${flight.inbound.airlineName} ${flight.inbound.flightCode} arrives ${flight.inbound.arrivalLabel}`,
  ].join(' · ')
}

export function buildAirlineSummary(flight: FlightCandidate) {
  if (flight.outbound.airlineName === flight.inbound.airlineName) {
    return flight.outbound.airlineName
  }

  return `${flight.outbound.airlineName} out · ${flight.inbound.airlineName} back`
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

export function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

function buildDatePairs(outboundDays: Weekday[], returnDays: Weekday[]) {
  const pairs: { inboundDate: Date; outboundDate: Date; stayLengthDays: number }[] = []
  const start = todayUtc()
  const end = addMonthsUtc(start, 12)

  for (
    let cursor = start;
    cursor.getTime() < end.getTime();
    cursor = addDays(cursor, 1)
  ) {
    if (!outboundDays.includes(toWeekday(cursor))) {
      continue
    }

    for (let stayLengthDays = 1; stayLengthDays <= 5; stayLengthDays += 1) {
      const inboundDate = addDays(cursor, stayLengthDays)

      if (inboundDate.getTime() >= end.getTime()) {
        continue
      }

      if (!returnDays.includes(toWeekday(inboundDate))) {
        continue
      }

      pairs.push({
        inboundDate,
        outboundDate: cursor,
        stayLengthDays,
      })
    }
  }

  return pairs
}

function buildLeg(input: {
  airport: AirportProfile
  airportCode: string
  carrier: AirlineId
  date: Date
  destination: string
  direction: Direction
  legKind: 'outbound' | 'inbound'
  origin: string
}) {
  const seed = hashString(
    [
      input.carrier,
      input.airportCode,
      toIsoDate(input.date),
      input.direction,
      input.legKind,
    ].join('|'),
  )
  const departureMinutes = buildDepartureMinutes(seed, input.legKind)
  const durationMinutes =
    input.airport.shortHaulMinutes +
    (seed % 16) -
    Math.round(input.airport.comfortBias * 8)
  const arrivalMinutes = departureMinutes + durationMinutes
  const airline = airlineProfiles[input.carrier]

  return {
    airlineId: input.carrier,
    airlineName: airline.label,
    arrivalLabel: formatClock(arrivalMinutes),
    arrivalMinutes,
    departureLabel: formatClock(departureMinutes),
    departureMinutes,
    durationMinutes,
    flightCode: `${airline.code} ${100 + (seed % 900)}`,
    officialLabel: airline.label,
    officialUrl: buildOfficialAirlineUrl({
      airportCode: input.airportCode,
      carrier: input.carrier,
      direction: input.direction,
      origin: input.origin,
    }),
  }
}

function buildPrice(input: {
  airport: AirportProfile
  inboundCarrier: AirlineId
  inboundDate: Date
  outboundCarrier: AirlineId
  outboundDate: Date
  stayLengthDays: number
}) {
  const seasonality =
    seasonalityByMonth[input.outboundDate.getUTCMonth()] +
    Math.round(seasonalityByMonth[input.inboundDate.getUTCMonth()] * 0.35)
  const carrierCost =
    airlineProfiles[input.outboundCarrier].priceModifier +
    airlineProfiles[input.inboundCarrier].priceModifier
  const stayPenalty = input.stayLengthDays >= 4 ? 10 : input.stayLengthDays === 1 ? -6 : 0
  const volatility =
    (hashString(
      `${input.airport.code}|${toIsoDate(input.outboundDate)}|${toIsoDate(input.inboundDate)}|price`,
    ) %
      34) -
    12

  const roughPrice =
    input.airport.priceBase +
    seasonality +
    carrierCost +
    stayPenalty +
    volatility

  return clampAndRoundPrice(roughPrice)
}

function buildRankScore(input: {
  airport: AirportProfile
  inboundArrivalMinutes: number
  outboundDepartureMinutes: number
  price: number
  sortMode: SortMode
  stayLengthDays: number
  totalFlightMinutes: number
}) {
  const morningPenalty =
    input.outboundDepartureMinutes < 7 * 60
      ? 18
      : input.outboundDepartureMinutes < 8 * 60
        ? 6
        : 0
  const lateArrivalPenalty = input.inboundArrivalMinutes > 22 * 60 ? 12 : 0
  const comfortPenalty = Math.round((1 - input.airport.comfortBias) * 30)
  const durationPenalty = Math.round(Math.max(input.totalFlightMinutes - 200, 0) * 0.18)
  const stayPenalty = input.stayLengthDays === 1 ? 8 : 0

  if (input.sortMode === 'cheapest') {
    return input.price + Math.round(durationPenalty * 0.25)
  }

  if (input.sortMode === 'fastest') {
    return input.totalFlightMinutes + Math.round(input.price * 0.18)
  }

  return (
    input.price +
    durationPenalty +
    comfortPenalty +
    morningPenalty +
    lateArrivalPenalty +
    stayPenalty
  )
}

function buildHighlights(input: {
  airport: AirportProfile
  inboundCarrier: AirlineId
  outboundCarrier: AirlineId
  price: number
  stayLengthDays: number
}) {
  const highlights: string[] = ['Direct only']

  if (input.price <= 95) {
    highlights.push('Lower fare')
  }

  if (input.outboundCarrier !== input.inboundCarrier) {
    highlights.push('Mixed airlines')
  }

  if (input.airport.code === 'LHR' || input.airport.code === 'LCY') {
    highlights.push('Stronger airport')
  }

  if (input.stayLengthDays >= 3) {
    highlights.push('Longer trip')
  }

  return highlights
}

function pickCarrier(carriers: AirlineId[], seed: number) {
  return carriers[seed % carriers.length]
}

function buildOfficialAirlineUrl(input: {
  airportCode: string
  carrier: AirlineId
  direction: Direction
  origin: string
}) {
  if (input.carrier === 'easyjet') {
    return buildEasyJetUrl(input.origin, input.airportCode, input.direction)
  }

  if (input.carrier === 'ba') {
    return buildBritishAirwaysUrl(input.origin, input.airportCode, input.direction)
  }

  if (input.carrier === 'swiss') {
    return input.direction === 'gva-to-london'
      ? 'https://www.swiss.com/lhg/gb/en/o-d/cy-cy/geneva-london'
      : 'https://www.swiss.com/lhg/gb/en/o-d/cy-cy/london-geneva'
  }

  if (input.carrier === 'jet2') {
    return 'https://www.jet2.com/en/flights'
  }

  return null
}

function buildEasyJetUrl(origin: string, airportCode: string, direction: Direction) {
  const airportSlugMap: Record<string, string> = {
    GVA: 'geneva',
    LGW: 'london-gatwick',
    LTN: 'london-luton',
    SEN: 'london-southend',
  }

  const originSlug = airportSlugMap[origin]
  const destinationSlug =
    direction === 'gva-to-london' ? airportSlugMap[airportCode] : airportSlugMap.GVA

  if (!originSlug || !destinationSlug) {
    return 'https://www.easyjet.com/en'
  }

  return `https://www.easyjet.com/en/cheap-flights/${originSlug}/${destinationSlug}`
}

function buildBritishAirwaysUrl(origin: string, airportCode: string, direction: Direction) {
  if (direction === 'gva-to-london') {
    if (origin === 'GVA') {
      return 'https://www.britishairways.com/content/en-gb/flights/from-geneva'
    }

    if (airportCode === 'LHR') {
      return 'https://www.britishairways.com/content/en-gb/flights/from-london-heathrow'
    }

    if (airportCode === 'LGW') {
      return 'https://www.britishairways.com/content/en-gb/flights/from-london-gatwick'
    }

    return 'https://www.britishairways.com/content/en-gb/destinations/london/flights-to-london'
  }

  return 'https://www.britishairways.com/content/en-gb/destinations/geneva/flights-to-geneva'
}

function buildDepartureMinutes(seed: number, legKind: 'outbound' | 'inbound') {
  const startHour = legKind === 'outbound' ? 6 : 9
  const hourSpan = legKind === 'outbound' ? 12 : 11
  const hour = startHour + ((seed >> (legKind === 'outbound' ? 2 : 5)) % hourSpan)
  const minute = ((seed >> (legKind === 'outbound' ? 8 : 11)) % 2) * 30
  return hour * 60 + minute
}

function isHourInRange(hour: number, startHour: number, endHour: number) {
  return hour >= startHour && hour < endHour
}

function clampAndRoundPrice(value: number) {
  const bounded = Math.max(55, Math.min(320, value))
  return Math.round(bounded / 5) * 5
}

function formatClock(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
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

function toWeekday(date: Date): Weekday {
  return weekdays[(date.getUTCDay() + 6) % 7]
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
