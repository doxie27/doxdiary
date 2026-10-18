import { dogAccents } from '../../data/meta'
import type { Dog } from '../../data/types'
import { cn } from '../../lib/cn'

interface Props {
  dog: Pick<Dog, 'name' | 'photoUrl' | 'accent'>
  size?: number
  className?: string
  ring?: boolean
}

/**
 * Porträt eines Hundes. Ohne Foto entsteht ein warmes Verlaufsporträt mit
 * Initiale – bewusst ohne Pfoten-Clipart.
 */
export function DogPortrait({ dog, size = 48, className, ring }: Props) {
  const a = dogAccents[dog.accent]
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-full', ring && 'ring-4 ring-surface', className)}
      style={{ width: size, height: size }}
    >
      {dog.photoUrl ? (
        <img src={dog.photoUrl} alt={dog.name} className="size-full object-cover" />
      ) : (
        <div
          className="flex size-full items-center justify-center"
          style={{ background: `radial-gradient(120% 120% at 30% 20%, ${a.from} 0%, ${a.to} 100%)` }}
          role="img"
          aria-label={dog.name}
        >
          <span className="font-display font-medium" style={{ color: a.ink, fontSize: size * 0.42, lineHeight: 1 }}>
            {dog.name.charAt(0)}
          </span>
        </div>
      )}
    </div>
  )
}

/** Großflächiger Hero-Hintergrund in der Akzentfarbe des Hundes. */
export function DogBackdrop({ dog, className }: { dog: Pick<Dog, 'photoUrl' | 'accent' | 'name'>; className?: string }) {
  const a = dogAccents[dog.accent]
  if (dog.photoUrl)
    return (
      <div className={cn('absolute inset-0', className)}>
        <img src={dog.photoUrl} alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
      </div>
    )
  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)} style={{ background: `linear-gradient(160deg, ${a.from} 0%, ${a.to} 100%)` }}>
      <div className="absolute -right-16 -top-20 size-72 rounded-full bg-white/25 blur-2xl" />
      <div className="absolute -bottom-24 -left-10 size-64 rounded-full bg-white/20 blur-2xl" />
      <svg aria-hidden viewBox="0 0 200 200" className="absolute -bottom-24 -right-20 size-80 opacity-25" style={{ color: a.ink }}>
        <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  )
}
