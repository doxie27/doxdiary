import { useEffect, useRef } from 'react'
import { ApiError } from '../api/client'
import { diaryApi, exerciseApi, importApi, planApi, sessionApi } from '../api/endpoints'
import { useToast } from '../components/ui'
import { demoExercises } from '../data/mock'
import type { DiaryEntry } from '../data/types'
import { dataUrlToBlob } from '../lib/image'
import { localKey, read, useStore, type LocalData } from './AppStore'
import { dequeueSession, pendingSessions } from './pending'

/**
 * Lädt im Live-Modus Übungen, Pläne, Einheiten und Tagebuch vom Server.
 * Vorher werden einmalig Daten übernommen, die vor diesem Update nur im
 * Browser lagen, und danach noch ausstehende Einheiten nachgesendet.
 */
export function LiveSync() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const running = useRef(false)
  const userId = state.user.id
  const dogKey = state.dogs.map((d) => d.id).join(',')

  useEffect(() => {
    if (state.mode !== 'live' || !state.authed || state.synced || running.current || !userId) return
    running.current = true
    ;(async () => {
      try {
        await importLocal(userId, () => toast('Deine bisherigen Daten wurden übernommen'))
        const dogIds = dogKey ? dogKey.split(',') : []
        const [exercises, perDog] = await Promise.all([
          exerciseApi.list(),
          Promise.all(dogIds.map(async (id) => ({ plans: await planApi.list(id), sessions: await sessionApi.list(id), diary: await diaryApi.list(id) }))),
        ])
        dispatch({
          type: 'liveData',
          exercises,
          plans: perDog.flatMap((d) => d.plans),
          sessions: [...perDog.flatMap((d) => d.sessions), ...pendingSessions(userId)],
          diary: perDog.flatMap((d) => d.diary),
        })
        flushPending(userId, dispatch)
      } catch (e) {
        if (e instanceof ApiError && e.status === 0) dispatch({ type: 'bootOffline' })
        else toast(e instanceof ApiError ? e.message : 'Daten konnten nicht geladen werden.')
      } finally {
        running.current = false
      }
    })()
  }, [state.mode, state.authed, state.synced, userId, dogKey, dispatch, toast])

  // Bei wiederkehrender Verbindung ausstehende Einheiten senden
  useEffect(() => {
    if (state.mode !== 'live' || !userId) return
    const onOnline = () => flushPending(userId, dispatch)
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [state.mode, userId, dispatch])

  return null
}

export async function flushPending(userId: string, dispatch: ReturnType<typeof useStore>['dispatch']) {
  for (const local of pendingSessions(userId)) {
    try {
      const saved = await sessionApi.create(local)
      dequeueSession(userId, local.id)
      dispatch({ type: 'replaceSession', localId: local.id, session: saved })
    } catch (e) {
      // Netzwerk weg → später erneut; fachlich abgelehnt (z. B. Hund gelöscht) → verwerfen
      if (!(e instanceof ApiError) || e.status === 0 || e.status >= 500) return
      dequeueSession(userId, local.id)
    }
  }
}

/** Einmalige Übernahme der vor Phase 3/4 lokal gespeicherten Daten. */
async function importLocal(userId: string, onDone: () => void) {
  const local = read<LocalData>(localKey(userId))
  if (!local) return
  const demoIds = new Set(demoExercises.map((e) => e.id))
  const changedExercises = local.exercises.filter((e) => !demoIds.has(e.id) || JSON.stringify(e) !== JSON.stringify(demoExercises.find((d) => d.id === e.id)))
  const hasContent = local.plans.length + local.sessions.length + local.diary.length + changedExercises.length > 0
  if (hasContent) {
    // Alle Übungen mitsenden: Startvorlagen werden serverseitig über den Namen wiederverwendet
    const result = await importApi.run({
      exercises: local.exercises,
      plans: local.plans,
      sessions: local.sessions.map((s) => ({ ...s, results: s.results.map((r) => ({ ...r, exerciseName: r.exerciseName ?? local.exercises.find((e) => e.id === r.exerciseId)?.name })) })),
      diary: local.diary.map(({ photos: _p, ...e }: DiaryEntry) => e),
    })
    for (const entry of local.diary) {
      const serverId = result.diaryMap[entry.id]
      if (!serverId) continue
      for (const photo of entry.photos.slice(0, 4)) {
        if (photo.startsWith('data:')) await diaryApi.addPhoto(serverId, await dataUrlToBlob(photo)).catch(() => null)
      }
    }
    onDone()
  }
  try {
    localStorage.removeItem(localKey(userId))
  } catch {
    /* ignorieren */
  }
}
