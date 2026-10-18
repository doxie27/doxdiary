import { useCallback } from 'react'
import { dogApi } from '../api/endpoints'
import type { Dog } from '../data/types'
import { useStore } from './AppStore'

/** Neues Foto (als Datei), Foto entfernen oder unverändert. */
export type PhotoChange = { file: Blob } | 'remove' | null

/**
 * Speichert und löscht Hunde – im Demo-Modus lokal, im Live-Modus über die API.
 * Die Komponenten müssen den Modus nicht kennen.
 */
export function useDogActions() {
  const { state, dispatch } = useStore()
  const live = state.mode === 'live'

  const save = useCallback(
    async (dog: Dog, photo: PhotoChange): Promise<Dog> => {
      if (!live) {
        dispatch({ type: 'upsertDog', dog })
        return dog
      }
      const exists = state.dogs.some((d) => d.id === dog.id)
      let saved = exists ? await dogApi.update(dog) : await dogApi.create(dog)
      if (photo && photo !== 'remove') saved = await dogApi.uploadPhoto(saved.id, new File([photo.file], 'photo.jpg', { type: 'image/jpeg' }))
      else if (photo === 'remove' && saved.photoUrl) saved = await dogApi.deletePhoto(saved.id)
      dispatch({ type: 'upsertDog', dog: saved })
      return saved
    },
    [live, state.dogs, dispatch],
  )

  const remove = useCallback(
    async (id: string) => {
      if (live) await dogApi.remove(id)
      dispatch({ type: 'removeDog', id })
    },
    [live, dispatch],
  )

  return { save, remove }
}
