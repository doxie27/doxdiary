import { describe, expect, it } from 'vitest'
import type { DiaryEntry, Dog, TrainingSession } from '../../data/types'
import { customPeriod, periodFor, periodTitle, possessive } from './period'
import { buildReview, buildVetReport } from './summary'

const dog = { id: 'd1', name: 'Lola' } as Dog
const entry = (id: string, at: string, category: DiaryEntry['category'] = 'alltag', extra: Partial<DiaryEntry> = {}): DiaryEntry => ({ id, dogId: 'd1', at, category, title: id, text: '', photos: [], ...extra })
const session = (at: string, results: TrainingSession['results'] = [], note = ''): TrainingSession => ({ id: at, dogId: 'd1', planId: 'p', planName: 'Morgenrunde', startedAt: at, finishedAt: at, activeSec: 600, results, note })

describe('Zeiträume', () => {
  const anchor = new Date('2026-10-18T12:00:00')
  it('Monat, Woche und Jahr mit deutschen Bezeichnungen', () => {
    const m = periodFor('month', anchor)
    expect(m.label).toBe('Oktober 2026')
    expect(m.range).toBe('1.–31. Oktober 2026')
    expect(periodFor('month', anchor, -1).label).toBe('September 2026')
    expect(periodFor('week', anchor).label).toMatch(/^KW 42 · 12\. Okt\.?–18\. Okt\.?$/)
    expect(periodFor('year', anchor).range).toBe('1. Januar – 31. Dezember 2026')
    expect(customPeriod('2026-09-28', '2026-10-03').range).toBe('28. September – 3. Oktober 2026')
  })
  it('Titel mit korrektem Genitiv', () => {
    expect(periodTitle('Lola', periodFor('month', anchor))).toBe('Lolas Oktober')
    expect(possessive('Max')).toBe('Max’')
    expect(periodTitle('Bruno', periodFor('year', anchor))).toBe('Brunos Jahr 2026')
  })
})

describe('Rückblick', () => {
  const p = periodFor('month', new Date('2026-10-18T12:00:00'))
  const diary = [
    entry('a', '2026-10-02T08:00:00', 'alltag', { photos: ['x.jpg', 'y.jpg'] }),
    entry('b', '2026-10-05T08:00:00', 'gesundheit', { highlight: true }),
    entry('c', '2026-09-30T08:00:00'), // außerhalb
    { ...entry('d', '2026-10-06T08:00:00'), dogId: 'd2' }, // anderer Hund
  ]
  const sessions = [session('2026-10-02T09:00:00'), session('2026-10-02T18:00:00'), session('2026-10-12T09:00:00')]

  it('filtert nach Hund, Zeitraum und Kategorie', () => {
    const r = buildReview(dog, diary, sessions, p, null)
    expect(r.entries.map((e) => e.id)).toEqual(['a', 'b'])
    expect(r.stats).toEqual({ entries: 2, photos: 2, sessions: 3, trainingDays: 2, activeMinutes: 30 })
    expect(r.highlights.map((e) => e.id)).toEqual(['b'])
    expect(buildReview(dog, diary, sessions, p, ['gesundheit']).entries.map((e) => e.id)).toEqual(['b'])
  })

  it('gruppiert ein Jahr nach Monaten', () => {
    const r = buildReview(dog, diary, sessions, periodFor('year', new Date('2026-10-18T12:00:00')), null)
    expect(r.buckets).toHaveLength(12)
    expect(r.buckets[9]).toMatchObject({ sessions: 3, minutes: 30 })
    expect(r.groups.map((g) => g.label)).toEqual(['September 2026', 'Oktober 2026'])
  })
})

describe('Bericht für Tierarzt/Physio', () => {
  it('sammelt Gesundheitseinträge und auffällige Beobachtungen', () => {
    const p = periodFor('month', new Date('2026-10-18T12:00:00'))
    const s = [
      session('2026-10-03T09:00:00', [
        { itemId: '1', exerciseId: 'e1', exerciseName: 'Sitz-Steh', status: 'done', feedback: 'good', note: '' },
        { itemId: '2', exerciseId: 'e2', exerciseName: 'Cavaletti', status: 'done', feedback: 'issue', note: 'Gezögert' },
        { itemId: '3', exerciseId: 'e3', status: 'skipped', feedback: null, note: '' },
      ], 'Müde'),
    ]
    const r = buildVetReport(dog, [entry('h', '2026-10-04T10:00:00', 'gesundheit'), entry('x', '2026-10-04T10:00:00')], s, [], [], p, new Date('2026-10-18T12:00:00'))
    expect(r.healthEntries.map((e) => e.id)).toEqual(['h'])
    expect(r.observations).toEqual([{ at: '2026-10-03T09:00:00', planName: 'Morgenrunde', exercise: 'Cavaletti', feedback: 'issue', note: 'Gezögert' }])
    expect(r.hardByExercise).toEqual([])
    expect(r.sessionNotes).toHaveLength(1)
    expect(r.review.feedback).toEqual({ good: 1, hard: 0, issue: 1, skipped: 1 })
  })
  it('fasst „schwierig“ ohne Notiz pro Übung zusammen', () => {
    const p = periodFor('month', new Date('2026-10-18T12:00:00'))
    const hard = (name: string) => ({ itemId: name, exerciseId: name, exerciseName: name, status: 'done' as const, feedback: 'hard' as const, note: '' })
    const s = [session('2026-10-03T09:00:00', [hard('A'), hard('B')]), session('2026-10-04T09:00:00', [hard('A')])]
    const r = buildVetReport(dog, [], s, [], [], p)
    expect(r.hardByExercise).toEqual([{ exercise: 'A', count: 2 }, { exercise: 'B', count: 1 }])
    expect(r.observations).toEqual([])
  })
})
