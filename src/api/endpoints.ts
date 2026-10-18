import type { DiaryEntry, Dog, Exercise, TrainingPlan, TrainingSession, User } from '../data/types'
import { API_BASE, api, apiBlob } from './client'

/** JSON-Formen der API (siehe api/src/Repositories/*::present) */
interface ApiUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: User['role']
  createdAt: string
  emailVerified: boolean
  isAdmin: boolean
}

interface ApiDog extends Omit<Dog, 'photoUrl'> {
  photoMediaId: string | null
  updatedAt: string
}

export interface SessionData {
  user: User
  dogs: Dog[]
}

const toUser = (u: ApiUser): User => ({ ...u })

export const toDog = (d: ApiDog & { access?: unknown }): Dog => {
  const { photoMediaId, updatedAt: _u, access: _a, ...rest } = d
  return { ...rest, photoUrl: photoMediaId ? `${API_BASE}/media/${photoMediaId}` : null }
}

const toSession = (r: { user: ApiUser; dogs: ApiDog[] }): SessionData => ({ user: toUser(r.user), dogs: r.dogs.map(toDog) })

export type DogInput = Pick<Dog, 'name' | 'breed' | 'sex' | 'birthDate' | 'weightKg' | 'neutered' | 'healthNotes' | 'bio' | 'accent'>

const dogInput = (d: Dog): DogInput => ({
  name: d.name,
  breed: d.breed,
  sex: d.sex,
  birthDate: d.birthDate,
  weightKg: d.weightKg,
  neutered: d.neutered,
  healthNotes: d.healthNotes,
  bio: d.bio,
  accent: d.accent,
})

export const authApi = {
  me: async () => toSession(await api('GET', '/me')),
  login: async (email: string, password: string) => toSession(await api('POST', '/auth/login', { email, password })),
  register: async (firstName: string, email: string, password: string, privacyAccepted: boolean) =>
    toSession(await api('POST', '/auth/register', { firstName, email, password, privacyAccepted })),
  logout: () => api<null>('POST', '/auth/logout'),
  forgot: (email: string) => api('POST', '/auth/password/forgot', { email }),
  reset: (token: string, password: string) => api<null>('POST', '/auth/password/reset', { token, password }),
  verifyEmail: (token: string) => api('POST', '/auth/email/verify', { token }),
}

export interface LegalLinks {
  imprintUrl: string | null
  privacyUrl: string | null
}

export const metaApi = {
  get: () => api<{ legal: LegalLinks }>('GET', '/meta'),
}

export const meApi = {
  update: async (firstName: string, lastName: string) => toUser((await api<{ user: ApiUser }>('PATCH', '/me', { firstName, lastName })).user),
  changePassword: (currentPassword: string, newPassword: string) => api('POST', '/me/password', { currentPassword, newPassword }),
  export: () => api<unknown>('GET', '/me/export'),
  delete: (password: string) => api<null>('POST', '/me/delete', { password }),
  resendVerification: () => api<{ ok: boolean; alreadyVerified?: boolean }>('POST', '/me/email/resend'),
}

export interface AdminStatus {
  system: {
    php: string
    database: string
    migrationsApplied: number
    migrationsAvailable: number
    latestMigration: string
    uploadsCount: number
    uploadsBytes: number
    errorsLast30Days: number
    mailDriver: string
    backupEncrypted: boolean
    backupTokenConfigured: boolean
    lastBackupAt: string | null
  }
  stats: {
    users: number
    usersVerified: number
    usersLocked: number
    activeLast30Days: number
    dogs: number
    sessions: number
    diaryEntries: number
    sessionsPerWeek: Array<{ week: string; sessions: number }>
  }
}

export interface AdminUser {
  id: string
  name: string
  email: string
  createdAt: string
  lastLoginAt: string | null
  verified: boolean
  locked: boolean
  dogs: number
}

export const adminApi = {
  status: () => api<AdminStatus>('GET', '/admin/status'),
  backup: (password: string) => apiBlob('/admin/backup', { password }),
  users: async () => (await api<{ users: AdminUser[] }>('GET', '/admin/users')).users,
  lock: (id: string) => api('POST', `/admin/users/${id}/lock`),
  unlock: (id: string) => api('POST', `/admin/users/${id}/unlock`),
  sendReset: (id: string) => api('POST', `/admin/users/${id}/reset`),
  remove: (id: string, password: string) => api<null>('POST', `/admin/users/${id}/delete`, { password }),
  audit: async () => (await api<{ entries: Array<{ action: string; at: string; target: string | null }> }>('GET', '/admin/audit')).entries,
}

export const dogApi = {
  create: async (d: Dog) => toDog((await api<{ dog: ApiDog }>('POST', '/dogs', dogInput(d))).dog),
  update: async (d: Dog) => toDog((await api<{ dog: ApiDog }>('PATCH', `/dogs/${d.id}`, dogInput(d))).dog),
  remove: (id: string) => api<null>('DELETE', `/dogs/${id}`),
  uploadPhoto: async (id: string, file: File) => {
    const form = new FormData()
    form.append('photo', file)
    return toDog((await api<{ dog: ApiDog }>('POST', `/dogs/${id}/photo`, form)).dog)
  },
  deletePhoto: async (id: string) => toDog((await api<{ dog: ApiDog }>('DELETE', `/dogs/${id}/photo`)).dog),
}

// ── Physiotherapie & Tagebuch ───────────────────────────────────────────

const mediaUrl = (id: string | null) => (id ? `${API_BASE}/media/${id}` : null)
/** Media-ID aus einer Foto-URL der API (für das Entfernen einzelner Fotos). */
export const mediaIdFromUrl = (url: string) => /\/media\/(\d+)/.exec(url)?.[1] ?? null

interface ApiExercise extends Omit<Exercise, 'mediaUrl'> {
  mediaId: string | null
}
const toExercise = ({ mediaId, ...e }: ApiExercise): Exercise => ({ ...e, mediaUrl: mediaUrl(mediaId) })

const exerciseInput = (e: Exercise) => ({
  name: e.name,
  description: e.description,
  category: e.category,
  reps: e.reps,
  sets: e.sets,
  durationSec: e.durationSec,
  restSec: e.restSec,
  equipment: e.equipment,
  notes: e.notes,
})

const photoForm = (blob: Blob) => {
  const form = new FormData()
  form.append('photo', new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' }))
  return form
}

export const exerciseApi = {
  list: async () => (await api<{ exercises: ApiExercise[] }>('GET', '/exercises')).exercises.map(toExercise),
  create: async (e: Exercise) => toExercise((await api<{ exercise: ApiExercise }>('POST', '/exercises', exerciseInput(e))).exercise),
  update: async (e: Exercise) => toExercise((await api<{ exercise: ApiExercise }>('PATCH', `/exercises/${e.id}`, exerciseInput(e))).exercise),
  remove: (id: string) => api<null>('DELETE', `/exercises/${id}`),
  uploadPhoto: async (id: string, blob: Blob) => toExercise((await api<{ exercise: ApiExercise }>('POST', `/exercises/${id}/photo`, photoForm(blob))).exercise),
  deletePhoto: async (id: string) => toExercise((await api<{ exercise: ApiExercise }>('DELETE', `/exercises/${id}/photo`)).exercise),
}

const planInput = (p: TrainingPlan) => ({
  name: p.name,
  description: p.description,
  weekdays: p.weekdays,
  timeOfDay: p.timeOfDay,
  archived: p.archived,
  items: p.items.map((i) => ({ id: i.id, exerciseId: i.exerciseId, reps: i.reps, sets: i.sets, durationSec: i.durationSec, restSec: i.restSec })),
})

export const planApi = {
  list: async (dogId: string) => (await api<{ plans: TrainingPlan[] }>('GET', `/dogs/${dogId}/plans`)).plans,
  create: async (p: TrainingPlan) => (await api<{ plan: TrainingPlan }>('POST', `/dogs/${p.dogId}/plans`, planInput(p))).plan,
  update: async (p: TrainingPlan) => (await api<{ plan: TrainingPlan }>('PATCH', `/plans/${p.id}`, planInput(p))).plan,
  remove: (id: string) => api<null>('DELETE', `/plans/${id}`),
}

interface ApiSession extends TrainingSession {
  clientId: string
}

export const sessionApi = {
  list: async (dogId: string) => (await api<{ sessions: ApiSession[] }>('GET', `/dogs/${dogId}/sessions`)).sessions,
  /** Idempotent über clientId (= lokale ID der Einheit) */
  create: async (s: TrainingSession) =>
    (
      await api<{ session: ApiSession }>('POST', `/dogs/${s.dogId}/sessions`, {
        clientId: s.id,
        planId: s.planId,
        planName: s.planName,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        activeSec: s.activeSec,
        note: s.note,
        results: s.results.map((r) => ({ itemId: r.itemId, exerciseId: r.exerciseId, exerciseName: r.exerciseName ?? 'Übung', status: r.status, feedback: r.feedback, note: r.note })),
      })
    ).session,
}

interface ApiDiaryEntry extends Omit<DiaryEntry, 'photos'> {
  photoIds: string[]
}
const toEntry = ({ photoIds, ...e }: ApiDiaryEntry): DiaryEntry => ({ ...e, photos: photoIds.map((id) => mediaUrl(id)!) })
const entryInput = (e: DiaryEntry) => ({ at: e.at, category: e.category, title: e.title, text: e.text })

export const diaryApi = {
  list: async (dogId: string) => (await api<{ entries: ApiDiaryEntry[] }>('GET', `/dogs/${dogId}/diary`)).entries.map(toEntry),
  create: async (e: DiaryEntry) => toEntry((await api<{ entry: ApiDiaryEntry }>('POST', `/dogs/${e.dogId}/diary`, entryInput(e))).entry),
  update: async (e: DiaryEntry) => toEntry((await api<{ entry: ApiDiaryEntry }>('PATCH', `/diary/${e.id}`, entryInput(e))).entry),
  remove: (id: string) => api<null>('DELETE', `/diary/${id}`),
  addPhoto: async (id: string, blob: Blob) => toEntry((await api<{ entry: ApiDiaryEntry }>('POST', `/diary/${id}/photos`, photoForm(blob))).entry),
  removePhoto: async (id: string, mediaId: string) => toEntry((await api<{ entry: ApiDiaryEntry }>('DELETE', `/diary/${id}/photos/${mediaId}`)).entry),
}

export interface ImportResult {
  exercises: number
  plans: number
  sessions: number
  diary: number
  diaryMap: Record<string, string>
}

export const importApi = {
  run: async (data: { exercises: Exercise[]; plans: TrainingPlan[]; sessions: TrainingSession[]; diary: Array<Omit<DiaryEntry, 'photos'>> }) =>
    (await api<{ imported: ImportResult }>('POST', '/me/import', data)).imported,
}
