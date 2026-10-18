import { Clock, Hourglass, Repeat, Layers } from 'lucide-react'
import { exerciseCategories } from '../../data/meta'
import type { Exercise, ExerciseCategory, Weekday } from '../../data/types'
import { cn } from '../../lib/cn'
import { duration, weekdayShort } from '../../lib/format'

export function CategoryBadge({ category, className }: { category: ExerciseCategory; className?: string }) {
  const m = exerciseCategories[category]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', m.tint, className)}>
      <m.icon className="size-3.5" />
      {m.label}
    </span>
  )
}

export function CategoryTile({ category, size = 44 }: { category: ExerciseCategory; size?: number }) {
  const m = exerciseCategories[category]
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-xl', m.tint)} style={{ width: size, height: size }}>
      <m.icon style={{ width: size * 0.45, height: size * 0.45 }} />
    </span>
  )
}

/** Kompakte Zusammenfassung der Belastungsparameter einer Übung. */
export function ParamLine({ reps, sets, durationSec, restSec, className }: Pick<Exercise, 'reps' | 'sets' | 'durationSec' | 'restSec'> & { className?: string }) {
  const parts: Array<{ icon: typeof Clock; text: string }> = []
  if (sets && sets > 1) parts.push({ icon: Layers, text: `${sets} Sätze` })
  if (reps) parts.push({ icon: Repeat, text: `${reps} Wdh.` })
  if (durationSec) parts.push({ icon: Clock, text: duration(durationSec) })
  if (restSec) parts.push({ icon: Hourglass, text: `${restSec} s Pause` })
  return (
    <div className={cn('flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-3', className)}>
      {parts.map((p) => (
        <span key={p.text} className="inline-flex items-center gap-1">
          <p.icon className="size-3.5" />
          {p.text}
        </span>
      ))}
    </div>
  )
}

export function WeekdayDots({ days }: { days: Weekday[] }) {
  return (
    <div className="flex gap-1" aria-label={`Trainingstage: ${days.map((d) => weekdayShort[d - 1]).join(', ')}`}>
      {weekdayShort.map((l, i) => {
        const on = days.includes((i + 1) as Weekday)
        return (
          <span key={l} className={cn('flex size-6 items-center justify-center rounded-full text-[10px] font-bold', on ? 'bg-sage-600 text-white' : 'bg-sunken text-ink-3')}>
            {l.charAt(0)}
          </span>
        )
      })}
    </div>
  )
}

export function scheduleLabel(days: Weekday[]): string {
  if (days.length === 7) return 'Täglich'
  if (days.length === 0) return 'Ohne feste Tage'
  if (days.length === 5 && days.every((d) => d <= 5)) return 'Werktags'
  return days.map((d) => weekdayShort[d - 1]).join(' · ')
}
