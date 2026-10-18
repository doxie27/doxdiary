const dateLong = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
const dateShort = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })
const dateFull = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })
const monthYear = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
const num = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

export const fmt = {
  dateLong: (d: Date | string) => dateLong.format(new Date(d)),
  dateShort: (d: Date | string) => dateShort.format(new Date(d)),
  dateFull: (d: Date | string) => dateFull.format(new Date(d)),
  time: (d: Date | string) => time.format(new Date(d)),
  monthYear: (d: Date | string) => monthYear.format(new Date(d)),
  num: (n: number) => num.format(n),
}

/** 90 → "1:30", 300 → "5:00" */
export function clock(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** 45 → "45 Sek.", 300 → "5 Min.", 330 → "5½ Min." */
export function duration(sec: number): string {
  if (sec < 60) return `${sec} Sek.`
  const min = sec / 60
  if (Number.isInteger(min)) return `${min} Min.`
  if (Number.isInteger(min * 2)) return `${Math.floor(min)}½ Min.`
  return `${Math.round(min)} Min.`
}

export function relativeDay(d: Date | string, now = new Date()): string {
  const a = new Date(d)
  const diff = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()) /
      86_400_000,
  )
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Gestern'
  if (diff > 1 && diff < 7) return `Vor ${diff} Tagen`
  return fmt.dateShort(a)
}

export function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 17) return 'Hallo'
  return 'Guten Abend'
}

export const weekdayShort = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
