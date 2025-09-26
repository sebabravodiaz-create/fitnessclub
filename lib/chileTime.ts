import { getChileTimeOverride } from '@/lib/timeSettings'

const CHILE_TZ = 'America/Santiago'

type DateInput = Date | string | number

function toDate(input: DateInput): Date {
  if (input instanceof Date) return new Date(input.getTime())
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return fromChileDateOnly(input)
  }
  return new Date(input)
}

const zonedFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CHILE_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
})

type ZonedParts = {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  second: string
  fraction: string
}

function getZonedParts(date: Date): ZonedParts {
  const override = getChileTimeOverride()
  if (typeof override === 'number') {
    const shifted = new Date(date.getTime() + override * 60 * 1000)
    return {
      year: String(shifted.getUTCFullYear()).padStart(4, '0'),
      month: String(shifted.getUTCMonth() + 1).padStart(2, '0'),
      day: String(shifted.getUTCDate()).padStart(2, '0'),
      hour: String(shifted.getUTCHours()).padStart(2, '0'),
      minute: String(shifted.getUTCMinutes()).padStart(2, '0'),
      second: String(shifted.getUTCSeconds()).padStart(2, '0'),
      fraction: String(shifted.getUTCMilliseconds()).padStart(3, '0'),
    }
  }
  const map: Partial<Record<string, string>> = {}
  for (const part of zonedFormatter.formatToParts(date)) {
    if (part.type === 'literal') continue
    map[part.type] = part.value
  }
  return {
    year: map.year ?? '1970',
    month: map.month ?? '01',
    day: map.day ?? '01',
    hour: map.hour ?? '00',
    minute: map.minute ?? '00',
    second: map.second ?? '00',
    fraction: map.fractionalSecond ?? '000',
  }
}

function getOffsetMinutes(date: Date): number {
  const override = getChileTimeOverride()
  if (typeof override === 'number') {
    return override
  }
  const parts = getZonedParts(date)
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
    Number(parts.fraction),
  )
  return (asUTC - date.getTime()) / 60000
}

function offsetToString(offsetMinutes: number): string {
  const sign = offsetMinutes <= 0 ? '-' : '+'
  const absolute = Math.abs(offsetMinutes)
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0')
  const minutes = String(absolute % 60).padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}

export function toChileISOString(input: DateInput): string {
  const date = toDate(input)
  const parts = getZonedParts(date)
  const offset = offsetToString(getOffsetMinutes(date))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${parts.fraction}${offset}`
}

export function toChileDateString(input: DateInput): string {
  return toChileISOString(input).slice(0, 10)
}

export function startOfChileDay(input: DateInput): Date {
  const isoDate = toChileDateString(input)
  return fromChileDateOnly(isoDate)
}

export function endOfChileDay(input: DateInput): Date {
  const start = startOfChileDay(input)
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
}

export function fromChileDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map((v) => Number(v))
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new Error(`Invalid Chile date string: ${dateStr}`)
  }
  // Use midday to obtain the correct offset for that calendar day and avoid DST switch issues.
  const reference = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const offsetMinutes = getOffsetMinutes(reference)
  const utcMillis = Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMinutes * 60 * 1000
  return new Date(utcMillis)
}

export function chileDateRange(from?: string | null, to?: string | null) {
  const isoFrom = from ? fromChileDateOnly(from).toISOString() : null
  const isoTo = to ? endOfChileDay(to).toISOString() : null
  return { isoFrom, isoTo }
}

export function formatChileDateTime(input: DateInput, options?: Intl.DateTimeFormatOptions) {
  const base: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }
  const final: Intl.DateTimeFormatOptions = { ...base, ...(options ?? {}) }
  for (const key of Object.keys(final)) {
    if ((final as any)[key] === undefined) delete (final as any)[key]
  }
  const override = getChileTimeOverride()
  const formatter = new Intl.DateTimeFormat('es-CL', {
    timeZone: override === null ? CHILE_TZ : 'UTC',
    hourCycle: 'h23',
    ...final,
  })
  const date = toDate(input)
  if (typeof override === 'number') {
    const shifted = new Date(date.getTime() + override * 60 * 1000)
    return formatter.format(shifted)
  }
  return formatter.format(date)
}

