import { beforeEach, describe, expect, it } from 'vitest'
import type { TrainingSession } from '../data/types'

// Minimaler localStorage für die Node-Testumgebung
const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size
  },
} as Storage

const { dequeueSession, pendingSessions, queueSession } = await import('./pending')
const { read } = await import('./AppStore')

const session = (id: string): TrainingSession => ({
  id,
  dogId: '1',
  planId: '2',
  planName: 'Morgenrunde',
  startedAt: '2026-10-18T07:00:00.000Z',
  finishedAt: '2026-10-18T07:10:00.000Z',
  activeSec: 600,
  results: [],
  note: '',
})

describe('Offline-Warteschlange', () => {
  beforeEach(() => store.clear())

  it('speichert Einheiten pro Konto und markiert sie als ausstehend', () => {
    queueSession('u1', session('s1'))
    queueSession('u2', session('s2'))
    expect(pendingSessions('u1').map((s) => [s.id, s.pending])).toEqual([['s1', true]])
    expect(pendingSessions('u2')).toHaveLength(1)
  })

  it('ersetzt dieselbe Einheit statt sie doppelt abzulegen', () => {
    queueSession('u1', session('s1'))
    queueSession('u1', { ...session('s1'), note: 'neu' })
    expect(pendingSessions('u1')).toHaveLength(1)
    expect(pendingSessions('u1')[0].note).toBe('neu')
  })

  it('entfernt den Speicher-Eintrag, sobald alles übertragen ist', () => {
    queueSession('u1', session('s1'))
    queueSession('u1', session('s2'))
    dequeueSession('u1', 's1')
    expect(pendingSessions('u1').map((s) => s.id)).toEqual(['s2'])
    dequeueSession('u1', 's2')
    expect(store.has('doxie-diary.pending.u1')).toBe(false)
  })
})

describe('read()', () => {
  beforeEach(() => store.clear())

  it('liest JSON und einfache Textwerte', () => {
    store.set('a', '{"x":1}')
    store.set('mode', 'live')
    expect(read('a')).toEqual({ x: 1 })
    expect(read('mode')).toBe('live')
    expect(read('fehlt')).toBeNull()
  })
})
