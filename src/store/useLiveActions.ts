import { useCallback } from 'react'
import { ApiError } from '../api/client'
import { diaryApi, exerciseApi, mediaIdFromUrl, planApi, sessionApi } from '../api/endpoints'
import type { DiaryEntry, Exercise, TrainingPlan, TrainingSession } from '../data/types'
import { useStore } from './AppStore'
import { queueSession } from './pending'
import type { PhotoChange } from './useDogActions'

/**
 * Speichern & Löschen für Übungen, Pläne, Einheiten und Tagebuch –
 * im Demo-Modus lokal, im Live-Modus über die API. Komponenten kennen den Modus nicht.
 */
export function useLiveActions() {
  const { state, dispatch } = useStore()
  const live = state.mode === 'live'
  const userId = state.user.id

  const saveExercise = useCallback(
    async (ex: Exercise, photo: PhotoChange): Promise<Exercise> => {
      if (!live) {
        dispatch({ type: 'upsertExercise', exercise: ex })
        return ex
      }
      const exists = state.exercises.some((e) => e.id === ex.id)
      let saved = exists ? await exerciseApi.update(ex) : await exerciseApi.create(ex)
      if (photo && photo !== 'remove') saved = await exerciseApi.uploadPhoto(saved.id, photo.file)
      else if (photo === 'remove' && saved.mediaUrl) saved = await exerciseApi.deletePhoto(saved.id)
      dispatch({ type: 'upsertExercise', exercise: saved })
      return saved
    },
    [live, state.exercises, dispatch],
  )

  const removeExercise = useCallback(
    async (id: string) => {
      if (live) await exerciseApi.remove(id)
      dispatch({ type: 'deleteExercise', id })
    },
    [live, dispatch],
  )

  const savePlan = useCallback(
    async (plan: TrainingPlan): Promise<TrainingPlan> => {
      if (!live) {
        dispatch({ type: 'upsertPlan', plan })
        return plan
      }
      const exists = state.plans.some((p) => p.id === plan.id)
      const saved = exists ? await planApi.update(plan) : await planApi.create(plan)
      dispatch({ type: 'upsertPlan', plan: saved })
      return saved
    },
    [live, state.plans, dispatch],
  )

  const removePlan = useCallback(
    async (id: string) => {
      if (live) await planApi.remove(id)
      dispatch({ type: 'deletePlan', id })
    },
    [live, dispatch],
  )

  /** Speichert eine Einheit; ohne Verbindung landet sie in der Warteschlange. */
  const saveSession = useCallback(
    async (session: TrainingSession): Promise<{ pending: boolean }> => {
      if (!live) {
        dispatch({ type: 'addSession', session })
        return { pending: false }
      }
      try {
        const saved = await sessionApi.create(session)
        dispatch({ type: 'replaceSession', localId: session.id, session: saved })
        return { pending: false }
      } catch (e) {
        if (e instanceof ApiError && e.status !== 0 && e.status < 500) throw e
        queueSession(userId, session)
        dispatch({ type: 'replaceSession', localId: session.id, session: { ...session, pending: true } })
        return { pending: true }
      }
    },
    [live, userId, dispatch],
  )

  /**
   * Tagebucheintrag speichern. Fotos: neue als Blobs, entfernte als URLs.
   * Im Demo-Modus sind Fotos Data-URLs direkt im Eintrag.
   */
  const saveEntry = useCallback(
    async (entry: DiaryEntry, added: Blob[], removed: string[]): Promise<DiaryEntry> => {
      if (!live) {
        dispatch({ type: 'upsertDiary', entry })
        return entry
      }
      const exists = state.diary.some((e) => e.id === entry.id)
      let saved = exists ? await diaryApi.update(entry) : await diaryApi.create(entry)
      for (const url of removed) {
        const mediaId = mediaIdFromUrl(url)
        if (mediaId) saved = await diaryApi.removePhoto(saved.id, mediaId)
      }
      for (const blob of added) saved = await diaryApi.addPhoto(saved.id, blob)
      dispatch({ type: 'upsertDiary', entry: saved })
      return saved
    },
    [live, state.diary, dispatch],
  )

  const removeEntry = useCallback(
    async (id: string) => {
      if (live) await diaryApi.remove(id)
      dispatch({ type: 'deleteDiary', id })
    },
    [live, dispatch],
  )

  return { saveExercise, removeExercise, savePlan, removePlan, saveSession, saveEntry, removeEntry }
}
