import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { createDemoState } from '../data/mock'
import type { DiaryEntry, Dog, DogMembership, Exercise, ID, TrainingPlan, TrainingSession, User } from '../data/types'

/**
 * Zentraler App-Zustand mit zwei Modi:
 * - demo: Prototyp mit Beispieldaten, alles nur im Browser (localStorage)
 * - live: Alle Daten kommen von der PHP-API (siehe LiveSync). Im Browser bleibt
 *   nur eine Warteschlange für noch nicht übertragene Trainingseinheiten.
 * Server-Daten (Profil, Gesundheit, Tagebuch) werden bewusst NICHT im
 * localStorage abgelegt.
 */

export type Mode = 'demo' | 'live'

export interface AppState {
  mode: Mode
  authed: boolean
  booting: boolean
  /** Live-Modus: Training & Tagebuch vom Server geladen */
  synced: boolean
  /** Start ohne Verbindung – Sitzung konnte nicht geprüft werden */
  offlineBoot?: boolean
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
  | { type: 'demoLogin' }
  | { type: 'liveSession'; user: User; dogs: Dog[] }
  | { type: 'bootDone' }
  | { type: 'bootOffline' }
  | { type: 'retryBoot' }
  | { type: 'liveData'; exercises: Exercise[]; plans: TrainingPlan[]; sessions: TrainingSession[]; diary: DiaryEntry[] }
  | { type: 'replaceSession'; localId: ID; session: TrainingSession }
  | { type: 'logout' }
  | { type: 'reset' }
  | { type: 'selectDog'; id: ID }
  | { type: 'updateUser'; user: User }
  | { type: 'upsertDog'; dog: Dog }
  | { type: 'removeDog'; id: ID }
  | { type: 'upsertExercise'; exercise: Exercise }
  | { type: 'deleteExercise'; id: ID }
  | { type: 'upsertPlan'; plan: TrainingPlan }
  | { type: 'deletePlan'; id: ID }
  | { type: 'addSession'; session: TrainingSession }
  | { type: 'upsertDiary'; entry: DiaryEntry }
  | { type: 'deleteDiary'; id: ID }

const DEMO_KEY = 'doxie-diary.prototype.v1'
const MODE_KEY = 'doxie-diary.mode'
/** Vor Phase 3/4 lagen Live-Daten lokal – wird von LiveSync einmalig importiert und gelöscht. */
export const localKey = (userId: ID) => `doxie-diary.local.${userId}`
const selectedKey = (userId: ID) => `doxie-diary.selected.${userId}`

export type LocalData = Pick<AppState, 'exercises' | 'plans' | 'sessions' | 'diary' | 'selectedDogId'>

export function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return raw as T // einfache Textwerte (z. B. Modus)
    }
  } catch {
    return null
  }
}

export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    /* Speicher voll oder blockiert – App läuft ohne Persistenz weiter */
  }
}

function demoState(): AppState {
  const demo = createDemoState()
  return { mode: 'demo', authed: false, booting: false, synced: true, selectedDogId: demo.dogs[0].id, ...demo }
}

const emptyUser: User = { id: '', firstName: '', lastName: '', email: '', role: 'owner', createdAt: '' }

function load(): AppState {
  const mode = read<string>(MODE_KEY)
  const savedDemo = read<AppState>(DEMO_KEY)
  // Demo-Modus (auch für Prototyp-Stände ohne gespeicherten Modus)
  if (mode === 'demo' || (mode === null && savedDemo?.authed)) {
    return savedDemo ? { ...demoState(), ...savedDemo, mode: 'demo', booting: false } : demoState()
  }
  // Live: Sitzung beim Server prüfen, bis dahin Ladebildschirm
  return { ...demoState(), mode: 'live', authed: false, booting: true, user: emptyUser, dogs: [], memberships: [] }
}


function upsert<T extends { id: ID }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id)
  if (i === -1) return [...list, item]
  const copy = list.slice()
  copy[i] = item
  return copy
}

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'demoLogin':
      return { ...demoState(), ...(read<AppState>(DEMO_KEY) ?? {}), mode: 'demo', authed: true, booting: false }
    case 'liveSession': {
      const remembered = read<string>(selectedKey(a.user.id)) ?? read<LocalData>(localKey(a.user.id))?.selectedDogId
      const selected = a.dogs.some((d) => d.id === remembered) ? remembered! : (a.dogs[0]?.id ?? '')
      const sameUser = state.mode === 'live' && state.user.id === a.user.id && state.synced
      return {
        ...state,
        ...(sameUser ? {} : { exercises: [], plans: [], sessions: [], diary: [], synced: false }),
        mode: 'live',
        authed: true,
        booting: false,
        user: a.user,
        dogs: a.dogs,
        memberships: a.dogs.map((d) => ({ userId: a.user.id, dogId: d.id, role: 'owner', scopes: ['profile', 'training', 'diary'] })),
        selectedDogId: selected,
      }
    }
    case 'bootDone':
      return { ...state, booting: false, offlineBoot: false }
    case 'bootOffline':
      return { ...state, booting: false, offlineBoot: true }
    case 'retryBoot':
      return { ...state, booting: true, offlineBoot: false }
    case 'liveData':
      return { ...state, exercises: a.exercises, plans: a.plans, sessions: a.sessions, diary: a.diary, synced: true }
    case 'replaceSession':
      return { ...state, sessions: [...state.sessions.filter((s) => s.id !== a.localId && s.id !== a.session.id), a.session] }
    case 'logout':
      return state.mode === 'live'
        ? { ...state, authed: false, synced: false, user: emptyUser, dogs: [], memberships: [], exercises: [], plans: [], sessions: [], diary: [] }
        : { ...state, authed: false }
    case 'reset':
      return state.mode === 'live' ? state : { ...demoState(), authed: true }
    case 'selectDog':
      return { ...state, selectedDogId: a.id }
    case 'updateUser':
      return { ...state, user: a.user }
    case 'upsertDog': {
      const isNew = !state.dogs.some((d) => d.id === a.dog.id)
      return {
        ...state,
        dogs: upsert(state.dogs, a.dog),
        memberships: isNew ? [...state.memberships, { userId: state.user.id, dogId: a.dog.id, role: 'owner', scopes: ['profile', 'training', 'diary'] }] : state.memberships,
        selectedDogId: isNew ? a.dog.id : state.selectedDogId,
      }
    }
    case 'removeDog': {
      const dogs = state.dogs.filter((d) => d.id !== a.id)
      return {
        ...state,
        dogs,
        memberships: state.memberships.filter((m) => m.dogId !== a.id),
        plans: state.plans.filter((p) => p.dogId !== a.id),
        sessions: state.sessions.filter((s) => s.dogId !== a.id),
        diary: state.diary.filter((e) => e.dogId !== a.id),
        selectedDogId: state.selectedDogId === a.id ? (dogs[0]?.id ?? '') : state.selectedDogId,
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
  /** Ausgewählter Hund. Innerhalb der App-Shell immer vorhanden (siehe RequireDog). */
  dog: Dog
}

const Ctx = createContext<Store | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, load)
  const dispatch = useCallback((a: Action) => rawDispatch(a), [])

  useEffect(() => {
    if (state.booting) return
    if (state.mode === 'demo') {
      write(MODE_KEY, 'demo')
      write(DEMO_KEY, state)
    } else if (state.authed) {
      write(MODE_KEY, 'live')
      write(selectedKey(state.user.id), state.selectedDogId)
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
