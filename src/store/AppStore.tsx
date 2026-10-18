import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { createDemoState } from '../data/mock'
import type { DiaryEntry, Dog, DogMembership, Exercise, ID, TrainingPlan, TrainingSession, User } from '../data/types'

/**
 * Prototyp-Store: hält alle Daten im Speicher und spiegelt sie in localStorage.
 * In Phase 2 werden die Aktionen durch Aufrufe der PHP-REST-API ersetzt
 * (src/api/*). Die Komponenten greifen nur über diesen Hook zu und bleiben
 * dadurch unverändert.
 */

export interface AppState {
  authed: boolean
  selectedDogId: ID
  user: User
  dogs: Dog[]
  memberships: DogMembership[]
  exercises: Exercise[]
  plans: TrainingPlan[]
  sessions: TrainingSession[]
  diary: DiaryEntry[]
}

type Action =
  | { type: 'login' }
  | { type: 'logout' }
  | { type: 'reset' }
  | { type: 'selectDog'; id: ID }
  | { type: 'updateUser'; user: User }
  | { type: 'upsertDog'; dog: Dog }
  | { type: 'upsertExercise'; exercise: Exercise }
  | { type: 'deleteExercise'; id: ID }
  | { type: 'upsertPlan'; plan: TrainingPlan }
  | { type: 'deletePlan'; id: ID }
  | { type: 'addSession'; session: TrainingSession }
  | { type: 'upsertDiary'; entry: DiaryEntry }
  | { type: 'deleteDiary'; id: ID }

const STORAGE_KEY = 'doxie-diary.prototype.v1'

function initial(): AppState {
  const demo = createDemoState()
  return { authed: false, selectedDogId: demo.dogs[0].id, ...demo }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {
    /* Speicher nicht verfügbar (privater Modus) – mit Demo-Daten starten */
  }
  return initial()
}

function upsert<T extends { id: ID }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id)
  if (i === -1) return [item, ...list]
  const copy = list.slice()
  copy[i] = item
  return copy
}

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'login':
      return { ...state, authed: true }
    case 'logout':
      return { ...state, authed: false }
    case 'reset':
      return { ...initial(), authed: true }
    case 'selectDog':
      return { ...state, selectedDogId: a.id }
    case 'updateUser':
      return { ...state, user: a.user }
    case 'upsertDog': {
      const isNew = !state.dogs.some((d) => d.id === a.dog.id)
      return {
        ...state,
        dogs: isNew ? [...state.dogs, a.dog] : upsert(state.dogs, a.dog),
        memberships: isNew
          ? [...state.memberships, { userId: state.user.id, dogId: a.dog.id, role: 'owner', scopes: ['profile', 'training', 'diary'] }]
          : state.memberships,
        selectedDogId: isNew ? a.dog.id : state.selectedDogId,
      }
    }
    case 'upsertExercise':
      return { ...state, exercises: upsert(state.exercises, a.exercise) }
    case 'deleteExercise':
      return {
        ...state,
        exercises: state.exercises.filter((e) => e.id !== a.id),
        plans: state.plans.map((p) => ({ ...p, items: p.items.filter((i) => i.exerciseId !== a.id) })),
      }
    case 'upsertPlan':
      return { ...state, plans: upsert(state.plans, a.plan) }
    case 'deletePlan':
      return { ...state, plans: state.plans.filter((p) => p.id !== a.id) }
    case 'addSession':
      return { ...state, sessions: [...state.sessions, a.session] }
    case 'upsertDiary':
      return { ...state, diary: upsert(state.diary, a.entry) }
    case 'deleteDiary':
      return { ...state, diary: state.diary.filter((e) => e.id !== a.id) }
  }
}

interface Store {
  state: AppState
  dispatch: (a: Action) => void
  dog: Dog
}

const Ctx = createContext<Store | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, load)
  const dispatch = useCallback((a: Action) => rawDispatch(a), [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* Quota überschritten oder blockiert – Prototyp läuft ohne Persistenz weiter */
    }
  }, [state])

  const dog = state.dogs.find((d) => d.id === state.selectedDogId) ?? state.dogs[0]
  const value = useMemo(() => ({ state, dispatch, dog }), [state, dispatch, dog])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore außerhalb von AppStoreProvider')
  return s
}
