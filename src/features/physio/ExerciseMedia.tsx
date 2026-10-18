import { exerciseCategories } from '../../data/meta'
import type { Exercise } from '../../data/types'
import { cn } from '../../lib/cn'

/** Foto/Video der Übung oder eine ruhige, kategoriebezogene Illustration als Platzhalter. */
export function ExerciseMedia({ exercise, className }: { exercise: Pick<Exercise, 'mediaUrl' | 'category' | 'name'>; className?: string }) {
  const m = exerciseCategories[exercise.category]
  if (exercise.mediaUrl) {
    const isVideo = exercise.mediaUrl.startsWith('data:video') || /\.(mp4|webm|mov)$/i.test(exercise.mediaUrl)
    return (
      <div className={cn('overflow-hidden rounded-[1.75rem] bg-sunken', className)}>
        {isVideo ? <video src={exercise.mediaUrl} controls playsInline className="size-full object-cover" /> : <img src={exercise.mediaUrl} alt={exercise.name} className="size-full object-cover" />}
      </div>
    )
  }
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden rounded-[1.75rem]', m.tint, className)}>
      <div className="absolute -left-10 -top-10 size-48 rounded-full bg-white/40 blur-2xl" />
      <div className="absolute -bottom-16 -right-6 size-56 rounded-full bg-white/30 blur-2xl" />
      <svg viewBox="0 0 200 120" className="absolute inset-x-0 bottom-0 w-full opacity-30" aria-hidden>
        <path d="M0 90 C40 70 70 100 110 85 S170 60 200 75 V120 H0Z" fill="currentColor" />
      </svg>
      <m.icon className="relative size-14" strokeWidth={1.4} />
    </div>
  )
}
