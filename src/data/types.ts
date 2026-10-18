/**
 * Domänenmodell von Doxie Diary.
 * Die Typen spiegeln das geplante Datenbankschema (siehe docs/03-architektur.md),
 * damit der Wechsel von Beispieldaten auf die PHP-API in Phase 2 nur die
 * Datenquelle austauscht, nicht die UI.
 */

export type ID = string

/** Systemrolle eines Accounts. `therapist` ist vorbereitet, aber noch nicht aktiv. */
export type AccountRole = 'owner' | 'therapist'

export interface User {
  id: ID
  firstName: string
  lastName: string
  email: string
  role: AccountRole
  createdAt: string
  /** Nur im Live-Modus gesetzt */
  emailVerified?: boolean
  isAdmin?: boolean
}

/**
 * Beziehung Benutzer ↔ Hund. Heute nur `owner`; `family` und `therapist`
 * ermöglichen später Familienkonten und Therapeutenfreigaben ohne Schemaumbau.
 */
export type DogAccessRole = 'owner' | 'family' | 'therapist'

export interface DogMembership {
  userId: ID
  dogId: ID
  role: DogAccessRole
  /** Feingranulare Freigaben, z. B. für Therapeuten: nur Training lesen. */
  scopes: Array<'profile' | 'training' | 'diary'>
}

export type DogSex = 'female' | 'male'
export type DogAccent = 'sage' | 'honey' | 'clay' | 'sky'

export interface Dog {
  id: ID
  name: string
  breed: string
  sex: DogSex
  birthDate: string // ISO-Datum
  weightKg: number
  neutered: boolean | null
  healthNotes: string
  bio: string
  photoUrl: string | null
  accent: DogAccent
}

export type ExerciseCategory =
  | 'kraft'
  | 'balance'
  | 'mobilitaet'
  | 'wahrnehmung'
  | 'ausdauer'
  | 'entspannung'

export interface Exercise {
  id: ID
  name: string
  description: string
  category: ExerciseCategory
  reps: number | null
  sets: number | null
  durationSec: number | null
  restSec: number | null
  equipment: string[]
  notes: string
  mediaUrl: string | null
  /** Herkunft: eigene Übung oder später von einer Therapeutin bereitgestellt. */
  source: AuthorRef
}

export interface AuthorRef {
  kind: 'owner' | 'therapist'
  name: string
}

/** Übung innerhalb eines Plans – Werte können die Standardwerte der Übung überschreiben. */
export interface PlanItem {
  id: ID
  exerciseId: ID
  reps: number | null
  sets: number | null
  durationSec: number | null
  restSec: number | null
}

/** 1 = Montag … 7 = Sonntag (ISO-8601) */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface TrainingPlan {
  id: ID
  dogId: ID
  name: string
  description: string
  weekdays: Weekday[]
  timeOfDay: string | null // "08:30"
  items: PlanItem[]
  archived: boolean
  source: AuthorRef
  createdAt: string
}

export type ExerciseFeedback = 'good' | 'hard' | 'issue'

export interface ExerciseResult {
  itemId: ID
  exerciseId: ID
  status: 'done' | 'skipped'
  feedback: ExerciseFeedback | null
  note: string
}

export interface TrainingSession {
  id: ID
  dogId: ID
  planId: ID
  planName: string
  startedAt: string
  finishedAt: string
  activeSec: number
  results: ExerciseResult[]
  note: string
}

export type DiaryCategory = 'alltag' | 'gesundheit' | 'verhalten' | 'training' | 'erlebnis'

export interface DiaryEntry {
  id: ID
  dogId: ID
  at: string
  category: DiaryCategory
  title: string
  text: string
  photos: string[]
}
