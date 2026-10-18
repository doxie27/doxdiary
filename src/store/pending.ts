import type { TrainingSession } from '../data/types'
import { read, write } from './AppStore'

/**
 * Warteschlange für Trainingseinheiten, die (z. B. im Funkloch) noch nicht
 * übertragen werden konnten. Liegt bewusst nur bis zur Übertragung im Browser.
 */
const key = (userId: string) => `doxie-diary.pending.${userId}`

export function pendingSessions(userId: string): TrainingSession[] {
  return read<TrainingSession[]>(key(userId)) ?? []
}

export function queueSession(userId: string, session: TrainingSession) {
  write(key(userId), [...pendingSessions(userId).filter((s) => s.id !== session.id), { ...session, pending: true }])
}

export function dequeueSession(userId: string, localId: string) {
  const rest = pendingSessions(userId).filter((s) => s.id !== localId)
  if (rest.length) write(key(userId), rest)
  else {
    try {
      localStorage.removeItem(key(userId))
    } catch {
      /* ignorieren */
    }
  }
}
