import { describe, expect, it } from 'vitest'
import type { TrainingSession } from '../data/types'
import { currentStreak, feedbackCounts, weeklyStats } from './selectors'

const at = (iso: string, activeSec = 600, results: TrainingSession['results'] = []): TrainingSession => ({
  id: iso, dogId: '1', planId: '1', planName: 'P', startedAt: iso, finishedAt: iso, activeSec, results, note: '',
})
const now = new Date('2026-10-18T12:00:00') // Sonntag

describe('Statistiken (nur Aktivität)', () => {
  it('zählt die Serie bis gestern, wenn heute noch nicht trainiert wurde', () => {
    const s = [at('2026-10-17T08:00:00'), at('2026-10-16T08:00:00'), at('2026-10-14T08:00:00')]
    expect(currentStreak(s, now)).toBe(2)
  })

  it('fasst Einheiten und Minuten pro Kalenderwoche zusammen', () => {
    const weeks = weeklyStats([at('2026-10-13T08:00:00', 600), at('2026-10-18T08:00:00', 300), at('2026-10-05T08:00:00', 1200)], 2, now)
    expect(weeks.map((w) => [w.sessions, w.minutes])).toEqual([[1, 20], [2, 15]])
  })

  it('zählt Rückmeldungen und übersprungene Übungen', () => {
    const r = (status: 'done' | 'skipped', feedback: 'good' | 'hard' | 'issue' | null) => ({ itemId: 'i', exerciseId: 'e', status, feedback, note: '' })
    expect(feedbackCounts([at('2026-10-18T08:00:00', 1, [r('done', 'good'), r('done', 'issue'), r('skipped', null)])])).toEqual({ good: 1, hard: 0, issue: 1, skipped: 1 })
  })
})
