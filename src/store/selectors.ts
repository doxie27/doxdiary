import type { Exercise, PlanItem, TrainingPlan, TrainingSession } from '../data/types'
import { addDays, dayKey, isoWeekday, isSameDay, startOfDay, startOfWeek, streak } from '../lib/date'
import type { AppState } from './AppStore'

export function activePlans(state: AppState, dogId: string): TrainingPlan[] {
  return state.plans.filter((p) => p.dogId === dogId && !p.archived)
}

export function dogSessions(state: AppState, dogId: string): TrainingSession[] {
  return state.sessions
    .filter((s) => s.dogId === dogId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export interface TodayPlan {
  plan: TrainingPlan
  done: TrainingSession | undefined
}

/** Für heute geplante Einheiten inkl. Status, sortiert nach Uhrzeit. */
export function todaysPlans(state: AppState, dogId: string, now = new Date()): TodayPlan[] {
  const wd = isoWeekday(now)
  const sessions = dogSessions(state, dogId)
  return activePlans(state, dogId)
    .filter((p) => p.weekdays.includes(wd))
    .sort((a, b) => (a.timeOfDay ?? '99').localeCompare(b.timeOfDay ?? '99'))
    .map((plan) => ({ plan, done: sessions.find((s) => s.planId === plan.id && isSameDay(s.startedAt, now)) }))
}

/** Effektive Werte einer Plan-Übung (Plan überschreibt Standardwerte der Übung). */
export function resolveItem(item: PlanItem, ex: Exercise) {
  return {
    reps: item.reps ?? ex.reps,
    sets: item.sets ?? ex.sets ?? 1,
    durationSec: item.durationSec ?? ex.durationSec,
    restSec: item.restSec ?? ex.restSec,
  }
}

/** Grobe Dauerabschätzung eines Plans in Minuten – nur zur Orientierung. */
export function estimateMinutes(plan: TrainingPlan, exercises: Exercise[]): number {
  let sec = 0
  for (const it of plan.items) {
    const ex = exercises.find((e) => e.id === it.exerciseId)
    if (!ex) continue
    const r = resolveItem(it, ex)
    const work = r.durationSec ?? (r.reps ?? 6) * 5
    sec += work * r.sets + (r.restSec ?? 0) * Math.max(0, r.sets - 1) + 20
  }
  return Math.max(1, Math.round(sec / 60))
}

export interface WeekStat {
  start: Date
  sessions: number
  minutes: number
}

/** Einheiten und aktive Minuten pro Kalenderwoche – reine Aktivitätsdaten. */
export function weeklyStats(sessions: TrainingSession[], weeks = 8, now = new Date()): WeekStat[] {
  const first = addDays(startOfWeek(now), -7 * (weeks - 1))
  const out: WeekStat[] = Array.from({ length: weeks }, (_, i) => ({ start: addDays(first, i * 7), sessions: 0, minutes: 0 }))
  for (const s of sessions) {
    const idx = Math.floor((startOfDay(new Date(s.startedAt)).getTime() - first.getTime()) / (7 * 86_400_000))
    if (idx < 0 || idx >= weeks) continue
    out[idx].sessions++
    out[idx].minutes += s.activeSec / 60
  }
  return out.map((w) => ({ ...w, minutes: Math.round(w.minutes) }))
}

export function trainingDays(sessions: TrainingSession[]): Set<string> {
  return new Set(sessions.map((s) => dayKey(s.startedAt)))
}

export function currentStreak(sessions: TrainingSession[], now = new Date()): number {
  return streak(trainingDays(sessions), now)
}

/** Anteil geplanter Einheiten, die in dieser Woche bis heute erledigt wurden. */
export function weekAdherence(state: AppState, dogId: string, now = new Date()) {
  const start = startOfWeek(now)
  let planned = 0
  for (let d = new Date(start); d <= now; d = addDays(d, 1)) {
    const wd = isoWeekday(d)
    planned += activePlans(state, dogId).filter((p) => p.weekdays.includes(wd)).length
  }
  const done = dogSessions(state, dogId).filter((s) => new Date(s.startedAt) >= start).length
  return { planned, done: Math.min(done, planned) }
}

export function feedbackCounts(sessions: TrainingSession[]) {
  const c = { good: 0, hard: 0, issue: 0, skipped: 0 }
  for (const s of sessions)
    for (const r of s.results) {
      if (r.status === 'skipped') c.skipped++
      else if (r.feedback) c[r.feedback]++
    }
  return c
}
