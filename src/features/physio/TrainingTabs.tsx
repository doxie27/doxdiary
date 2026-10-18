import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'

const tabs = [
  { to: '/training', label: 'Pläne', end: true },
  { to: '/training/exercises', label: 'Übungen' },
  { to: '/training/history', label: 'Verlauf' },
]

/** Unternavigation des Trainingsbereichs – als Links, damit jede Ansicht eine eigene URL hat. */
export function TrainingTabs() {
  return (
    <nav className="mx-5 mb-6 grid grid-cols-3 rounded-2xl bg-sunken p-1 lg:mx-8" aria-label="Trainingsbereich">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn('flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-300', isActive ? 'bg-surface text-ink shadow-card' : 'text-ink-3 hover:text-ink-2')
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
