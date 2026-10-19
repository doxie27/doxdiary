import { addDays, startOfDay, startOfWeek } from '../../lib/date'

export type PeriodKind = 'week' | 'month' | 'year' | 'custom'

export interface Period {
  kind: PeriodKind
  from: Date // inklusive, 00:00
  to: Date // exklusive, 00:00 des Folgetags
  /** z. B. „Oktober 2026“, „KW 42 · 12.–18. Okt.“ */
  label: string
  /** z. B. „1.–31. Oktober 2026“ */
  range: string
}

const month = new Intl.DateTimeFormat('de-DE', { month: 'long' })
const monthYear = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
const dayMonth = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' })
const dayMonthShort = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })
const full = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })

/** ISO-Kalenderwoche */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

function rangeText(from: Date, toExclusive: Date): string {
  const last = addDays(toExclusive, -1)
  if (from.getFullYear() !== last.getFullYear()) return `${full.format(from)} – ${full.format(last)}`
  if (from.getMonth() !== last.getMonth()) return `${dayMonth.format(from)} – ${full.format(last)}`
  return `${from.getDate()}.–${full.format(last)}`
}

/** Zeitraum, in dem `anchor` liegt; `offset` verschiebt um ganze Einheiten (−1 = vorheriger). */
export function periodFor(kind: Exclude<PeriodKind, 'custom'>, anchor: Date, offset = 0): Period {
  if (kind === 'week') {
    const from = addDays(startOfWeek(anchor), offset * 7)
    const to = addDays(from, 7)
    return { kind, from, to, label: `KW ${isoWeek(from)} · ${dayMonthShort.format(from)}–${dayMonthShort.format(addDays(to, -1))}`, range: rangeText(from, to) }
  }
  if (kind === 'month') {
    const from = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1)
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1)
    return { kind, from, to, label: monthYear.format(from), range: rangeText(from, to) }
  }
  const from = new Date(anchor.getFullYear() + offset, 0, 1)
  const to = new Date(from.getFullYear() + 1, 0, 1)
  return { kind, from, to, label: String(from.getFullYear()), range: rangeText(from, to) }
}

export function customPeriod(fromIso: string, toIso: string): Period {
  const from = startOfDay(new Date(fromIso + 'T00:00:00'))
  const to = addDays(startOfDay(new Date(toIso + 'T00:00:00')), 1)
  return { kind: 'custom', from, to, label: rangeText(from, to), range: rangeText(from, to) }
}

/** Titel mit Genitiv: „Lolas Oktober“, „Max’ Jahr 2026“ */
export function possessive(name: string): string {
  return /[sßxz]$/i.test(name) ? `${name}’` : `${name}s`
}

export function periodTitle(dogName: string, p: Period): string {
  const who = possessive(dogName)
  if (p.kind === 'month') return `${who} ${month.format(p.from)}`
  if (p.kind === 'year') return `${who} Jahr ${p.from.getFullYear()}`
  if (p.kind === 'week') return `${who} Woche`
  return `${who} Rückblick`
}

export const inPeriod = (iso: string, p: Period) => {
  const t = new Date(iso).getTime()
  return t >= p.from.getTime() && t < p.to.getTime()
}
