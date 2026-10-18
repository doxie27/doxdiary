import type { Weekday } from '../data/types'

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag */
export function isoWeekday(d: Date): Weekday {
  const w = d.getDay()
  return (w === 0 ? 7 : w) as Weekday
}

export function dayKey(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${x.getFullYear()}-${m}-${day}`
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  return dayKey(a) === dayKey(b)
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Montag der Woche, in der `d` liegt. */
export function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), 1 - isoWeekday(d))
}

export function ageFrom(birthDate: string, now = new Date()): { years: number; months: number } {
  const b = new Date(birthDate)
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) months--
  return { years: Math.floor(months / 12), months: months % 12 }
}

/** Aufeinanderfolgende Tage mit mindestens einer Einheit, endend heute oder gestern. */
export function streak(days: Set<string>, today = new Date()): number {
  let cursor = startOfDay(today)
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1)
  let n = 0
  while (days.has(dayKey(cursor))) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}
