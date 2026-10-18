import {
  Activity,
  Brain,
  Dumbbell,
  Footprints,
  HeartPulse,
  Mountain,
  type LucideIcon,
  MessageCircleHeart,
  Move,
  Scale,
  Sparkles,
  Sun,
  ThumbsUp,
  TriangleAlert,
  Waves,
} from 'lucide-react'
import type { DiaryCategory, DogAccent, ExerciseCategory, ExerciseFeedback } from './types'

interface Meta {
  label: string
  icon: LucideIcon
  /** Tailwind-Klassen für Hintergrund-Tönung und Icon-Farbe */
  tint: string
}

export const exerciseCategories: Record<ExerciseCategory, Meta> = {
  kraft: { label: 'Kräftigung', icon: Dumbbell, tint: 'bg-sage-100 text-sage-700' },
  balance: { label: 'Balance', icon: Scale, tint: 'bg-honey-100 text-honey-600' },
  mobilitaet: { label: 'Beweglichkeit', icon: Move, tint: 'bg-sky-100 text-sky-600' },
  wahrnehmung: { label: 'Koordination', icon: Footprints, tint: 'bg-clay-100 text-clay-600' },
  ausdauer: { label: 'Ausdauer', icon: Activity, tint: 'bg-sage-100 text-sage-700' },
  entspannung: { label: 'Entspannung', icon: Waves, tint: 'bg-sky-100 text-sky-600' },
}

export const diaryCategories: Record<DiaryCategory, Meta> = {
  alltag: { label: 'Alltag', icon: Sun, tint: 'bg-honey-100 text-honey-600' },
  gesundheit: { label: 'Gesundheit', icon: HeartPulse, tint: 'bg-clay-100 text-clay-600' },
  verhalten: { label: 'Verhalten', icon: Brain, tint: 'bg-sky-100 text-sky-600' },
  training: { label: 'Training', icon: Dumbbell, tint: 'bg-sage-100 text-sage-700' },
  erlebnis: { label: 'Erlebnis', icon: Sparkles, tint: 'bg-honey-100 text-honey-600' },
}

export const feedbackMeta: Record<ExerciseFeedback, Meta & { short: string }> = {
  good: { label: 'Gut funktioniert', short: 'Gut', icon: ThumbsUp, tint: 'bg-sage-100 text-good' },
  hard: { label: 'War schwierig', short: 'Schwierig', icon: Mountain, tint: 'bg-honey-100 text-warn' },
  issue: {
    label: 'Beschwerden aufgefallen',
    short: 'Beschwerden',
    icon: TriangleAlert,
    tint: 'bg-clay-100 text-alert',
  },
}

/** Persönliche Akzentfarbe je Hund – für Porträt und Hervorhebungen. */
export const dogAccents: Record<DogAccent, { from: string; to: string; ink: string; soft: string }> = {
  sage: { from: '#c9d6c3', to: '#7f9b77', ink: '#2e4035', soft: 'bg-sage-100' },
  honey: { from: '#f6dfae', to: '#d6a24a', ink: '#5b4013', soft: 'bg-honey-100' },
  clay: { from: '#f2d0bd', to: '#c97d55', ink: '#5a2e17', soft: 'bg-clay-100' },
  sky: { from: '#d3e1ea', to: '#7d9db1', ink: '#23394a', soft: 'bg-sky-100' },
}

export const supportIcon = MessageCircleHeart
