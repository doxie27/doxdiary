import { describe, expect, it } from 'vitest'
import { demoExercises, demoPlans } from '../../data/mock'
import type { TrainingPlan } from '../../data/types'
import { buildSteps, initSession, sessionReducer, type SessionEvent, type SessionState } from './sessionMachine'

const run = (s: SessionState, ...events: SessionEvent[]) => events.reduce(sessionReducer, s)
const ticks = (n: number): SessionEvent[] => Array.from({ length: n }, () => ({ type: 'tick' }))

// Plan: Sitz-Steh (8 Wdh × 2, 30 s Pause) → Balancekissen (3 × 30 s, 20 s Pause)
const plan: TrainingPlan = { ...demoPlans[0], items: demoPlans[0].items.slice(0, 2) }
const fresh = () => initSession(buildSteps(plan, demoExercises))

describe('sessionMachine', () => {
  it('startet mit der ersten Übung', () => {
    const s = run(fresh(), { type: 'start' })
    expect(s.phase).toBe('work')
    expect(s.index).toBe(0)
    expect(s.set).toBe(1)
  })

  it('zählt Wiederholungen und wechselt nach dem Satz in die Pause', () => {
    const counts: SessionEvent[] = Array.from({ length: 8 }, () => ({ type: 'countRep' }))
    const s = run(fresh(), { type: 'start' }, ...counts)
    expect(s.phase).toBe('rest')
    expect(s.timerLeft).toBe(30)
    const next = run(s, ...ticks(30))
    expect(next.phase).toBe('work')
    expect(next.set).toBe(2)
  })

  it('verlangt nach dem letzten Satz eine Rückmeldung und speichert sie', () => {
    const counts: SessionEvent[] = Array.from({ length: 8 }, () => ({ type: 'countRep' }))
    let s = run(fresh(), { type: 'start' }, ...counts, { type: 'skipRest' }, ...counts)
    expect(s.phase).toBe('feedback')
    s = run(s, { type: 'feedback', feedback: 'hard', note: '  etwas müde ' })
    expect(s.results).toEqual([{ itemId: 'p1i1', exerciseId: 'e1', exerciseName: 'Sitz-Steh-Wechsel', status: 'done', feedback: 'hard', note: 'etwas müde' }])
    expect(s.index).toBe(1)
    expect(s.timerLeft).toBe(30)
  })

  it('läuft den Timer ab und pausiert global', () => {
    let s = run(fresh(), { type: 'start' }, { type: 'skipExercise' }, { type: 'toggleTimer' }, ...ticks(10))
    expect(s.timerLeft).toBe(20)
    s = run(s, { type: 'pause' }, ...ticks(5))
    expect(s.timerLeft).toBe(20)
    s = run(s, { type: 'resume' }, ...ticks(20))
    expect(s.phase).toBe('rest')
    expect(s.activeSec).toBe(30)
  })

  it('markiert beim vorzeitigen Beenden offene Übungen als übersprungen', () => {
    const s = run(fresh(), { type: 'start' }, { type: 'finishEarly' })
    expect(s.phase).toBe('summary')
    expect(s.results.map((r) => r.status)).toEqual(['skipped', 'skipped'])
  })

  it('endet nach der letzten Übung in der Zusammenfassung', () => {
    const s = run(fresh(), { type: 'start' }, { type: 'skipExercise' }, { type: 'completeExercise' }, { type: 'feedback', feedback: 'good', note: '' })
    expect(s.phase).toBe('summary')
    expect(s.results).toHaveLength(2)
  })

  it('ignoriert Zähler bei zeitbasierten Übungen', () => {
    const s = run(fresh(), { type: 'start' }, { type: 'skipExercise' }, { type: 'countRep' })
    expect(s.reps).toBe(0)
  })
})
