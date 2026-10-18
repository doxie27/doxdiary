import type {
  DiaryEntry,
  Dog,
  DogMembership,
  Exercise,
  ExerciseFeedback,
  ExerciseResult,
  TrainingPlan,
  TrainingSession,
  User,
  Weekday,
} from './types'
import { isoWeekday, startOfDay } from '../lib/date'

/**
 * Realistische Beispieldaten für den Prototyp.
 * Die Trainingshistorie wird relativ zu „heute“ deterministisch erzeugt,
 * damit Kalender und Diagramme immer gefüllt aussehen.
 */

const me = { kind: 'owner' as const, name: 'Nico' }

export const demoUser: User = {
  id: 'u1',
  firstName: 'Nico',
  lastName: 'Muster',
  email: 'nico@example.com',
  role: 'owner',
  createdAt: '2026-03-02T10:00:00Z',
}

export const demoDogs: Dog[] = [
  {
    id: 'd1',
    name: 'Lola',
    breed: 'Rauhaardackel',
    sex: 'female',
    birthDate: '2019-04-12',
    weightKg: 8.4,
    neutered: true,
    healthNotes:
      'Bandscheibenvorfall (Th13/L1) im Frühjahr 2025, konservativ behandelt. Keine Treppen, nicht aufs Sofa springen lassen.',
    bio: 'Neugierige Gartenforscherin mit großem Herz für Leberwurst. Liebt Schnüffelspiele und Sonnenflecken auf dem Teppich.',
    photoUrl: null,
    accent: 'honey',
  },
  {
    id: 'd2',
    name: 'Bruno',
    breed: 'Labrador-Mix',
    sex: 'male',
    birthDate: '2016-09-03',
    weightKg: 31.2,
    neutered: false,
    healthNotes: 'Beginnende Arthrose im linken Ellbogen. Kurze, häufige Spaziergänge statt langer Touren.',
    bio: 'Gemütlicher Gentleman, der jeden Besuch persönlich begrüßt. Schwimmt für sein Leben gern.',
    photoUrl: null,
    accent: 'sage',
  },
]

export const demoMemberships: DogMembership[] = demoDogs.map((d) => ({
  userId: demoUser.id,
  dogId: d.id,
  role: 'owner',
  scopes: ['profile', 'training', 'diary'],
}))

export const demoExercises: Exercise[] = [
  {
    id: 'e1',
    name: 'Sitz-Steh-Wechsel',
    description:
      'Aus dem geraden Sitz langsam in den Stand kommen und wieder zurück. Achte auf einen symmetrischen Sitz – beide Hinterbeine eng am Körper.',
    category: 'kraft',
    reps: 8,
    sets: 2,
    durationSec: null,
    restSec: 30,
    equipment: ['Leckerlis'],
    notes: 'Langsam ist besser als schnell. Lieber weniger saubere Wiederholungen.',
    mediaUrl: null,
    source: me,
  },
  {
    id: 'e2',
    name: 'Stand auf dem Balancekissen',
    description:
      'Vorderpfoten auf das Kissen stellen, ruhig stehen lassen. Mit einem Leckerli vor der Nase die Position halten.',
    category: 'balance',
    reps: null,
    sets: 3,
    durationSec: 30,
    restSec: 20,
    equipment: ['Balancekissen', 'Rutschfeste Matte'],
    notes: 'Kissen nur halb aufpumpen, damit es nicht zu wackelig wird.',
    mediaUrl: null,
    source: me,
  },
  {
    id: 'e3',
    name: 'Cavaletti-Stangen',
    description:
      'Im ruhigen Schritt über 4–6 Bodenstangen führen. Abstand etwa eine Schulterhöhe. Der Hund soll jede Stange bewusst übersteigen.',
    category: 'wahrnehmung',
    reps: 6,
    sets: 1,
    durationSec: null,
    restSec: 15,
    equipment: ['Bodenstangen', 'Leine'],
    notes: '',
    mediaUrl: null,
    source: me,
  },
  {
    id: 'e4',
    name: 'Leckerli-Dehnung zur Seite',
    description:
      'Im Stand ein Leckerli langsam Richtung Hüfte führen, sodass sich der Hund seitlich biegt. Kurz halten, dann zur anderen Seite.',
    category: 'mobilitaet',
    reps: 5,
    sets: 2,
    durationSec: null,
    restSec: 20,
    equipment: ['Leckerlis'],
    notes: 'Nur so weit, wie es angenehm ist – kein Ziehen in die Dehnung.',
    mediaUrl: null,
    source: me,
  },
  {
    id: 'e5',
    name: 'Ruhiges Bergaufgehen',
    description: 'Eine sanfte Steigung im langsamen Schritt hinaufgehen. Gleichmäßiges Tempo, kein Ziehen an der Leine.',
    category: 'ausdauer',
    reps: null,
    sets: 1,
    durationSec: 300,
    restSec: null,
    equipment: ['Geschirr', 'Leine'],
    notes: '',
    mediaUrl: null,
    source: me,
  },
  {
    id: 'e6',
    name: 'Rückwärtsgehen',
    description: 'In einem schmalen Gang 2–3 Meter langsam rückwärts gehen lassen. Fördert das bewusste Setzen der Hinterpfoten.',
    category: 'kraft',
    reps: 5,
    sets: 1,
    durationSec: null,
    restSec: 20,
    equipment: ['Schmaler Gang oder Begrenzung'],
    notes: '',
    mediaUrl: null,
    source: me,
  },
  {
    id: 'e7',
    name: 'Vorderpfoten erhöht',
    description: 'Vorderpfoten auf eine stabile, niedrige Stufe stellen und die Position halten. Rücken bleibt gerade.',
    category: 'kraft',
    reps: null,
    sets: 3,
    durationSec: 20,
    restSec: 20,
    equipment: ['Stabile Stufe (ca. 10 cm)'],
    notes: '',
    mediaUrl: null,
    source: me,
  },
  {
    id: 'e8',
    name: 'Achten um Pylonen',
    description: 'In weiten, ruhigen Achten um zwei Pylonen führen. Wechselt die Biegerichtung des Körpers gleichmäßig.',
    category: 'mobilitaet',
    reps: 4,
    sets: 1,
    durationSec: null,
    restSec: 15,
    equipment: ['2 Pylonen'],
    notes: '',
    mediaUrl: null,
    source: me,
  },
  {
    id: 'e9',
    name: 'Entspannungsmassage',
    description:
      'Mit flacher Hand in langen, ruhigen Strichen vom Nacken entlang der Rückenmuskulatur streichen. Zum Abschluss jedes Trainings.',
    category: 'entspannung',
    reps: null,
    sets: 1,
    durationSec: 180,
    restSec: null,
    equipment: ['Weiche Decke'],
    notes: 'Nicht direkt auf die Wirbelsäule drücken.',
    mediaUrl: null,
    source: me,
  },
]

const item = (id: string, exerciseId: string, o: Partial<TrainingPlan['items'][number]> = {}) => ({
  id,
  exerciseId,
  reps: null,
  sets: null,
  durationSec: null,
  restSec: null,
  ...o,
})

const allDays: Weekday[] = [1, 2, 3, 4, 5, 6, 7]

export const demoPlans: TrainingPlan[] = [
  {
    id: 'p1',
    dogId: 'd1',
    name: 'Lolas tägliches Physiotraining',
    description: 'Sanfte Grundroutine für Rumpf und Hinterhand. Am besten vor dem Frühstück.',
    weekdays: allDays,
    timeOfDay: '08:00',
    items: [item('p1i1', 'e1'), item('p1i2', 'e2'), item('p1i3', 'e3'), item('p1i4', 'e4', { reps: 4 }), item('p1i5', 'e9')],
    archived: false,
    source: me,
    createdAt: '2026-06-02T08:00:00Z',
  },
  {
    id: 'p2',
    dogId: 'd1',
    name: 'Rücken-Kräftigung',
    description: 'Etwas intensivere Einheit an drei Tagen pro Woche.',
    weekdays: [2, 4, 6],
    timeOfDay: '17:30',
    items: [item('p2i1', 'e6'), item('p2i2', 'e7'), item('p2i3', 'e5', { durationSec: 240 })],
    archived: false,
    source: me,
    createdAt: '2026-07-14T08:00:00Z',
  },
  {
    id: 'p3',
    dogId: 'd1',
    name: 'Reha-Start (erste 6 Wochen)',
    description: 'Sehr kurze Einheiten direkt nach der Ruhephase.',
    weekdays: allDays,
    timeOfDay: null,
    items: [item('p3i1', 'e2', { durationSec: 15 }), item('p3i2', 'e9')],
    archived: true,
    source: me,
    createdAt: '2026-04-20T08:00:00Z',
  },
  {
    id: 'p4',
    dogId: 'd2',
    name: 'Brunos Gelenk-Routine',
    description: 'Bewegung ohne Stoßbelastung für die Ellbogen.',
    weekdays: [1, 3, 5],
    timeOfDay: '18:00',
    items: [item('p4i1', 'e8'), item('p4i2', 'e3'), item('p4i3', 'e5'), item('p4i4', 'e9')],
    archived: false,
    source: me,
    createdAt: '2026-08-01T08:00:00Z',
  },
]

/** Kleiner deterministischer Zufallsgenerator (mulberry32). */
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const issueNotes = ['Hat beim Aufstehen kurz gezögert.', 'Wirkte heute etwas steif in der Hinterhand.']
const hardNotes = ['Brauchte mehr Pausen als sonst.', 'Konzentration war schnell weg.', '']

function buildSessions(): TrainingSession[] {
  const rand = rng(42)
  const today = startOfDay(new Date())
  const out: TrainingSession[] = []
  const active = demoPlans.filter((p) => !p.archived)
  for (let back = 63; back >= 1; back--) {
    const day = new Date(today)
    day.setDate(day.getDate() - back)
    const wd = isoWeekday(day)
    for (const plan of active) {
      if (!plan.weekdays.includes(wd)) continue
      const created = new Date(plan.createdAt)
      if (day < startOfDay(created)) continue
      // Wochenenden etwas seltener, damit der Verlauf realistisch wirkt
      const chance = wd >= 6 ? 0.6 : 0.82
      if (rand() > chance) continue
      const [h, m] = (plan.timeOfDay ?? '09:00').split(':').map(Number)
      const start = new Date(day)
      start.setHours(h, m + Math.round(rand() * 40), 0, 0)
      let activeSec = 0
      const results: ExerciseResult[] = plan.items.map((it) => {
        const ex = demoExercises.find((e) => e.id === it.exerciseId)!
        const skipped = rand() < 0.06
        const r = rand()
        const feedback: ExerciseFeedback = r < 0.03 ? 'issue' : r < 0.2 ? 'hard' : 'good'
        const dur = it.durationSec ?? ex.durationSec ?? (it.reps ?? ex.reps ?? 6) * (it.sets ?? ex.sets ?? 1) * 6
        if (!skipped) activeSec += dur + (ex.restSec ?? 0)
        return {
          itemId: it.id,
          exerciseId: it.exerciseId,
          status: skipped ? 'skipped' : 'done',
          feedback: skipped ? null : feedback,
          note:
            !skipped && feedback === 'issue'
              ? issueNotes[Math.floor(rand() * issueNotes.length)]
              : !skipped && feedback === 'hard'
                ? hardNotes[Math.floor(rand() * hardNotes.length)]
                : '',
        }
      })
      const end = new Date(start.getTime() + (activeSec + 120) * 1000)
      out.push({
        id: `s-${plan.id}-${back}`,
        dogId: plan.dogId,
        planId: plan.id,
        planName: plan.name,
        startedAt: start.toISOString(),
        finishedAt: end.toISOString(),
        activeSec,
        results,
        note: rand() < 0.15 ? 'Sehr motiviert heute, hat super mitgemacht.' : '',
      })
    }
  }
  return out
}

function daysAgo(n: number, h: number, m = 0) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export const demoDiary: DiaryEntry[] = [
  {
    id: 'j1',
    dogId: 'd1',
    at: daysAgo(0, 7, 20),
    category: 'alltag',
    title: 'Morgenrunde im Nebel',
    text: 'Ganz ruhige Runde am Feldweg. Lola hat ausgiebig geschnüffelt und ist danach zufrieden auf ihre Decke.',
    photos: [],
  },
  {
    id: 'j2',
    dogId: 'd1',
    at: daysAgo(1, 19, 5),
    category: 'gesundheit',
    title: 'Kontrolltermin Physio',
    text: 'Termin bei Frau Berger. Übungen wie bisher fortführen, Balancekissen-Zeit langsam steigern. Nächster Termin in 4 Wochen.',
    photos: [],
  },
  {
    id: 'j3',
    dogId: 'd1',
    at: daysAgo(3, 16, 40),
    category: 'verhalten',
    title: 'Neuer Nachbarshund',
    text: 'Erste Begegnung mit Fiete über den Zaun. Etwas Gebell, dann neugieriges Schnuppern. Nächstes Mal gemeinsam spazieren?',
    photos: [],
  },
  {
    id: 'j4',
    dogId: 'd1',
    at: daysAgo(6, 11, 15),
    category: 'erlebnis',
    title: 'Erster Ausflug an den See',
    text: 'Mit Hundebuggy hingefahren, am Ufer 15 Minuten gelaufen. Sie war total entspannt und hat die Enten beobachtet.',
    photos: [],
  },
  {
    id: 'j5',
    dogId: 'd1',
    at: daysAgo(9, 20, 0),
    category: 'training',
    title: 'Cavaletti klappt besser',
    text: 'Heute alle sechs Durchgänge ohne Anstoßen an den Stangen. Kleine Party mit Käsewürfeln.',
    photos: [],
  },
  {
    id: 'j6',
    dogId: 'd2',
    at: daysAgo(1, 18, 30),
    category: 'alltag',
    title: 'Schwimmen im Baggersee',
    text: 'Zehn Minuten geschwommen, danach lange gedöst. Am Abend keine Auffälligkeiten.',
    photos: [],
  },
  {
    id: 'j7',
    dogId: 'd2',
    at: daysAgo(4, 9, 0),
    category: 'gesundheit',
    title: 'Gewicht kontrolliert',
    text: '31,2 kg beim Tierarzt. Futtermenge bleibt wie gehabt.',
    photos: [],
  },
]

export function createDemoState() {
  return {
    user: demoUser,
    dogs: demoDogs,
    memberships: demoMemberships,
    exercises: demoExercises,
    plans: demoPlans,
    sessions: buildSessions(),
    diary: demoDiary,
  }
}
