import type { DiaryCategory, DiaryEntry, Dog, Exercise, ExerciseFeedback, TrainingPlan, TrainingSession } from '../../data/types'
import { addDays, dayKey, startOfWeek } from '../../lib/date'
import { inPeriod, type Period } from './period'

/**
 * Daten für Rückblick und Tierarzt/Physio-Bericht. Reine Funktionen –
 * App-Vorschau und PDF nutzen dieselben Ergebnisse.
 * Grundsatz: nur Aktivität und eigene Beobachtungen, keine Gesundheitsbewertung.
 */

export interface ReviewData {
  entries: DiaryEntry[] // chronologisch aufsteigend
  highlights: DiaryEntry[]
  photos: string[]
  sessions: TrainingSession[] // chronologisch aufsteigend
  stats: {
    entries: number
    photos: number
    sessions: number
    trainingDays: number
    activeMinutes: number
  }
  categories: Array<{ category: DiaryCategory; count: number }>
  /** Einheiten pro Woche (Monat/Woche/frei) oder pro Monat (Jahr) */
  buckets: Array<{ label: string; sessions: number; minutes: number }>
  bucketUnit: 'week' | 'month'
  feedback: Record<ExerciseFeedback, number> & { skipped: number }
  /** Monats- oder Tagesgruppen für die Zeitleiste */
  groups: Array<{ key: string; label: string; entries: DiaryEntry[] }>
}

const monthLabel = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
const monthShort = new Intl.DateTimeFormat('de-DE', { month: 'short' })
const dayLabel = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
const dayShort = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })

export function buildReview(
  dog: Dog,
  diary: DiaryEntry[],
  sessions: TrainingSession[],
  period: Period,
  categories: DiaryCategory[] | null,
): ReviewData {
  const entries = diary
    .filter((e) => e.dogId === dog.id && inPeriod(e.at, period) && (!categories || categories.includes(e.category)))
    .sort((a, b) => a.at.localeCompare(b.at))
  const own = sessions.filter((s) => s.dogId === dog.id && inPeriod(s.startedAt, period)).sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const photos = entries.flatMap((e) => e.photos)

  const catCount = new Map<DiaryCategory, number>()
  for (const e of entries) catCount.set(e.category, (catCount.get(e.category) ?? 0) + 1)

  const byMonth = period.kind === 'year' || period.to.getTime() - period.from.getTime() > 92 * 86_400_000
  const buckets: ReviewData['buckets'] = []
  if (byMonth) {
    for (let d = new Date(period.from.getFullYear(), period.from.getMonth(), 1); d < period.to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const inMonth = own.filter((s) => new Date(s.startedAt) >= d && new Date(s.startedAt) < next)
      buckets.push({ label: monthShort.format(d).replace('.', ''), sessions: inMonth.length, minutes: Math.round(inMonth.reduce((a, s) => a + s.activeSec, 0) / 60) })
    }
  } else {
    for (let d = startOfWeek(period.from); d < period.to; d = addDays(d, 7)) {
      const next = addDays(d, 7)
      const inWeek = own.filter((s) => new Date(s.startedAt) >= d && new Date(s.startedAt) < next)
      buckets.push({ label: dayShort.format(d < period.from ? period.from : d).replace('.', ''), sessions: inWeek.length, minutes: Math.round(inWeek.reduce((a, s) => a + s.activeSec, 0) / 60) })
    }
  }

  const feedback = { good: 0, hard: 0, issue: 0, skipped: 0 }
  for (const s of own)
    for (const r of s.results) {
      if (r.status === 'skipped') feedback.skipped++
      else if (r.feedback) feedback[r.feedback]++
    }

  const groups = new Map<string, { key: string; label: string; entries: DiaryEntry[] }>()
  for (const e of entries) {
    const d = new Date(e.at)
    const key = byMonth ? `${d.getFullYear()}-${d.getMonth()}` : dayKey(d)
    if (!groups.has(key)) groups.set(key, { key, label: byMonth ? monthLabel.format(d) : dayLabel.format(d), entries: [] })
    groups.get(key)!.entries.push(e)
  }

  return {
    entries,
    highlights: entries.filter((e) => e.highlight),
    photos,
    sessions: own,
    stats: {
      entries: entries.length,
      photos: photos.length,
      sessions: own.length,
      trainingDays: new Set(own.map((s) => dayKey(s.startedAt))).size,
      activeMinutes: Math.round(own.reduce((a, s) => a + s.activeSec, 0) / 60),
    },
    categories: [...catCount.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    buckets,
    bucketUnit: byMonth ? 'month' : 'week',
    feedback,
    groups: [...groups.values()],
  }
}

export interface Observation {
  at: string
  planName: string
  exercise: string
  feedback: ExerciseFeedback | null
  note: string
}

export interface VetReportData {
  review: ReviewData
  healthEntries: DiaryEntry[]
  /** Einzeln: Beschwerden und Rückmeldungen mit Notiz */
  observations: Observation[]
  /** „War schwierig“ ohne Notiz – pro Übung gezählt, häufigste zuerst */
  hardByExercise: Array<{ exercise: string; count: number }>
  sessionNotes: Array<{ at: string; planName: string; note: string }>
  plans: Array<{ plan: TrainingPlan; exercises: Array<{ name: string; params: string }> }>
  /** geplante vs. durchgeführte Einheiten im Zeitraum (bis heute) */
  adherence: { planned: number; done: number }
}

/** Sachlicher Bericht für Tierarzt/Physio: Gesundheit, Training und eigene Beobachtungen. */
export function buildVetReport(
  dog: Dog,
  diary: DiaryEntry[],
  sessions: TrainingSession[],
  plans: TrainingPlan[],
  exercises: Exercise[],
  period: Period,
  now = new Date(),
): VetReportData {
  const review = buildReview(dog, diary, sessions, period, null)
  const exName = (id: string, fallback?: string) => exercises.find((e) => e.id === id)?.name ?? fallback ?? 'Übung'
  const observations: Observation[] = []
  const hard = new Map<string, number>()
  const sessionNotes: VetReportData['sessionNotes'] = []
  for (const s of review.sessions) {
    if (s.note) sessionNotes.push({ at: s.startedAt, planName: s.planName, note: s.note })
    for (const r of s.results) {
      if (r.status !== 'done') continue
      const name = exName(r.exerciseId, r.exerciseName)
      if (r.feedback === 'issue' || r.note) observations.push({ at: s.startedAt, planName: s.planName, exercise: name, feedback: r.feedback, note: r.note })
      else if (r.feedback === 'hard') hard.set(name, (hard.get(name) ?? 0) + 1)
    }
  }

  const active = plans.filter((p) => p.dogId === dog.id && !p.archived)
  const fmtParams = (reps: number | null, sets: number | null, dur: number | null, rest: number | null) =>
    [sets && sets > 1 ? `${sets} Sätze` : null, reps ? `${reps} Wdh.` : null, dur ? (dur >= 60 && dur % 60 === 0 ? `${dur / 60} Min.` : `${dur} Sek.`) : null, rest ? `${rest} s Pause` : null]
      .filter(Boolean)
      .join(' · ')

  let planned = 0
  const end = period.to < now ? period.to : addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1)
  for (let d = new Date(period.from); d < end; d = addDays(d, 1)) {
    const wd = d.getDay() === 0 ? 7 : d.getDay()
    planned += active.filter((p) => p.weekdays.includes(wd as 1) && new Date(p.createdAt) <= addDays(d, 1)).length
  }

  return {
    review,
    healthEntries: review.entries.filter((e) => e.category === 'gesundheit'),
    observations,
    hardByExercise: [...hard.entries()].map(([exercise, count]) => ({ exercise, count })).sort((a, b) => b.count - a.count),
    sessionNotes,
    plans: active.map((plan) => ({
      plan,
      exercises: plan.items.map((it) => {
        const ex = exercises.find((e) => e.id === it.exerciseId)
        return { name: ex?.name ?? 'Übung', params: fmtParams(it.reps ?? ex?.reps ?? null, it.sets ?? ex?.sets ?? null, it.durationSec ?? ex?.durationSec ?? null, it.restSec ?? ex?.restSec ?? null) }
      }),
    })),
    adherence: { planned, done: Math.min(review.stats.sessions, planned || review.stats.sessions) },
  }
}
