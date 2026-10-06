import type { CalendarDate } from '../domain/calendar'

export function getTodayDate(): CalendarDate {
  return toDateKey(new Date())
}

export function toDateKey(date: Date): CalendarDate {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(dateKey: CalendarDate): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function isDateKey(value: unknown): value is CalendarDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = parseDateKey(value)
  return toDateKey(date) === value
}

export function compareDates(left: CalendarDate, right: CalendarDate): number {
  return left.localeCompare(right)
}

export function addDays(dateKey: CalendarDate, amount: number): CalendarDate {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + amount)
  return toDateKey(date)
}

export function previousDay(dateKey: CalendarDate): CalendarDate {
  return addDays(dateKey, -1)
}

export function nextDay(dateKey: CalendarDate): CalendarDate {
  return addDays(dateKey, 1)
}

export function formatDate(dateKey: CalendarDate, options: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}): string {
  return new Intl.DateTimeFormat(undefined, options).format(parseDateKey(dateKey))
}

export function monthKey(dateKey: CalendarDate): string {
  return dateKey.slice(0, 7)
}

export function firstOfMonth(dateKey: CalendarDate): CalendarDate {
  const date = parseDateKey(dateKey)
  date.setDate(1)
  return toDateKey(date)
}

export function shiftMonth(dateKey: CalendarDate, amount: number): CalendarDate {
  const date = parseDateKey(dateKey)
  date.setDate(1)
  date.setMonth(date.getMonth() + amount)
  return toDateKey(date)
}

export function monthCalendarDates(dateKey: CalendarDate): CalendarDate[] {
  const first = parseDateKey(firstOfMonth(dateKey))
  const offset = (first.getDay() + 6) % 7
  const start = addDays(toDateKey(first), -offset)
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}
