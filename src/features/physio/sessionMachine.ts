import type { Exercise, ExerciseFeedback, ExerciseResult, TrainingPlan } from '../../data/types'
import { resolveItem } from '../../store/selectors'

/**
 * Ablauf einer Trainingseinheit als reine Zustandsmaschine.
 * Die UI dispatcht nur Ereignisse; Timerlogik und Übergänge sind dadurch
 * ohne Browser testbar (siehe sessionMachine.test.ts).
 */

export interface Step {
  itemId: string
  exercise: Exercise
  reps: number | null
  sets: number
  durationSec: number | null
  restSec: number | null
}

export type Phase = 'intro' | 'work' | 'rest' | 'feedback' | 'summary'

export interface SessionState {
  steps: Step[]
  phase: Phase
  index: number
  set: number
  reps: number
  timerLeft: number
  timerRunning: boolean
  paused: boolean
  activeSec: number
  results: ExerciseResult[]
  /** Ergebnis der aktuellen Übung, bevor Rückmeldung gegeben wurde */
  pendingStatus: 'done' | null
}

export type SessionEvent =
  | { type: 'start' }
  | { type: 'tick' }
  | { type: 'toggleTimer' }
  | { type: 'resetTimer' }
  | { type: 'countRep' }
  | { type: 'undoRep' }
  | { type: 'completeSet' }
  | { type: 'skipRest' }
  | { type: 'completeExercise' }
  | { type: 'skipExercise' }
  | { type: 'feedback'; feedback: ExerciseFeedback | null; note: string }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'finishEarly' }

export function buildSteps(plan: TrainingPlan, exercises: Exercise[]): Step[] {
  return plan.items.flatMap((it) => {
    const ex = exercises.find((e) => e.id === it.exerciseId)
    if (!ex) return []
    return [{ itemId: it.id, exercise: ex, ...resolveItem(it, ex) }]
  })
}

export function initSession(steps: Step[]): SessionState {
  return { steps, phase: 'intro', index: 0, set: 1, reps: 0, timerLeft: steps[0]?.durationSec ?? 0, timerRunning: false, paused: false, activeSec: 0, results: [], pendingStatus: null }
}

export const currentStep = (s: SessionState): Step | undefined => s.steps[s.index]

function enterWork(s: SessionState, index: number, set: number): SessionState {
  const step = s.steps[index]
  if (!step) return { ...s, phase: 'summary', timerRunning: false }
  return { ...s, phase: 'work', index, set, reps: 0, timerLeft: step.durationSec ?? 0, timerRunning: false, pendingStatus: null }
}

/** Satz beendet: Pause vor dem nächsten Satz oder Rückmeldung zur Übung. */
function finishSet(s: SessionState): SessionState {
  const step = currentStep(s)!
  if (s.set < step.sets) {
    if (step.restSec) return { ...s, phase: 'rest', timerLeft: step.restSec, timerRunning: true }
    return enterWork(s, s.index, s.set + 1)
  }
  return { ...s, phase: 'feedback', timerRunning: false, pendingStatus: 'done' }
}

function nextExercise(s: SessionState): SessionState {
  return enterWork(s, s.index + 1, 1)
}

export function sessionReducer(s: SessionState, e: SessionEvent): SessionState {
  const step = currentStep(s)
  switch (e.type) {
    case 'start':
      return s.phase === 'intro' ? enterWork(s, 0, 1) : s
    case 'pause':
      return s.phase === 'summary' ? s : { ...s, paused: true }
    case 'resume':
      return { ...s, paused: false }
    case 'tick': {
      if (s.paused || (s.phase !== 'work' && s.phase !== 'rest')) return s
      const active = { ...s, activeSec: s.activeSec + 1 }
      if (!s.timerRunning) return active
      const left = s.timerLeft - 1
      if (left > 0) return { ...active, timerLeft: left }
      if (s.phase === 'rest') return enterWork({ ...active, timerLeft: 0 }, s.index, s.set + 1)
      return finishSet({ ...active, timerLeft: 0, timerRunning: false })
    }
    case 'toggleTimer':
      if (s.phase !== 'work' || !step?.durationSec || s.paused) return s
      if (s.timerLeft === 0) return { ...s, timerLeft: step.durationSec, timerRunning: true }
      return { ...s, timerRunning: !s.timerRunning }
    case 'resetTimer':
      return s.phase === 'work' && step?.durationSec ? { ...s, timerLeft: step.durationSec, timerRunning: false } : s
    case 'countRep': {
      if (s.phase !== 'work' || s.paused || !step || step.durationSec) return s
      const reps = s.reps + 1
      return step.reps && reps >= step.reps ? finishSet({ ...s, reps }) : { ...s, reps }
    }
    case 'undoRep':
      return { ...s, reps: Math.max(0, s.reps - 1) }
    case 'completeSet':
      return s.phase === 'work' ? finishSet({ ...s, timerRunning: false }) : s
    case 'skipRest':
      return s.phase === 'rest' ? enterWork(s, s.index, s.set + 1) : s
    case 'completeExercise':
      return s.phase === 'work' || s.phase === 'rest' ? { ...s, phase: 'feedback', timerRunning: false, pendingStatus: 'done' } : s
    case 'skipExercise': {
      if (!step || (s.phase !== 'work' && s.phase !== 'rest')) return s
      const r: ExerciseResult = { itemId: step.itemId, exerciseId: step.exercise.id, status: 'skipped', feedback: null, note: '' }
      return nextExercise({ ...s, results: [...s.results, r] })
    }
    case 'feedback': {
      if (s.phase !== 'feedback' || !step) return s
      const r: ExerciseResult = { itemId: step.itemId, exerciseId: step.exercise.id, status: 'done', feedback: e.feedback, note: e.note.trim() }
      return nextExercise({ ...s, results: [...s.results, r] })
    }
    case 'finishEarly': {
      const done = new Set(s.results.map((r) => r.itemId))
      const rest: ExerciseResult[] = s.steps
        .filter((st) => !done.has(st.itemId))
        .map((st) => ({ itemId: st.itemId, exerciseId: st.exercise.id, status: 'skipped', feedback: null, note: '' }))
      return { ...s, phase: 'summary', paused: false, timerRunning: false, results: [...s.results, ...rest] }
    }
  }
}
