import { BookHeart, Dumbbell, House, NotebookPen, Plus, Play, UserRound, Dog as DogIcon, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/AppStore'
import { todaysPlans } from '../../store/selectors'
import { DogPortrait, LogoMark, Sheet } from '../ui'
import { DogSwitcher } from './DogSwitcher'

const nav = [
  { to: '/', label: 'Heute', icon: House, end: true },
  { to: '/training', label: 'Training', icon: Dumbbell },
  { to: '/diary', label: 'Tagebuch', icon: BookHeart },
  { to: '/dog', label: 'Profil', icon: DogIcon },
]

export function AppShell() {
  const [quick, setQuick] = useState(false)
  const [switcher, setSwitcher] = useState(false)
  const { state, dog } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const next = todaysPlans(state, dog.id).find((t) => !t.done)

  // Neue Seite beginnt oben – wie in nativen Apps
  useEffect(() => window.scrollTo(0, 0), [location.pathname])

  const go = (to: string) => {
    setQuick(false)
    navigate(to)
  }

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop-Seitenleiste */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-line/70 px-5 py-7 lg:flex">
        <Brand />
        <button onClick={() => setSwitcher(true)} className="mt-8 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-line-strong">
          <DogPortrait dog={dog} size={44} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{dog.name}</div>
            <div className="truncate text-xs text-ink-3">{dog.breed}</div>
          </div>
          <span className="text-xs font-semibold text-sage-600">Wechseln</span>
        </button>
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn('flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition', isActive ? 'bg-sage-100 text-sage-800' : 'text-ink-2 hover:bg-sunken')
              }
            >
              <n.icon className="size-5" strokeWidth={2} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        {next && (
          <button onClick={() => navigate(`/training/session/${next.plan.id}`)} className="mt-6 rounded-2xl bg-sage-600 p-4 text-left text-white shadow-float transition hover:bg-sage-700">
            <div className="text-xs font-semibold uppercase tracking-wider text-sage-200">Als Nächstes</div>
            <div className="mt-1 font-semibold leading-snug">{next.plan.name}</div>
            <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold"><Play className="size-4 fill-current" /> Training starten</div>
          </button>
        )}
        <div className="mt-auto">
          <NavLink to="/account" className={({ isActive }) => cn('flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold', isActive ? 'bg-sage-100 text-sage-800' : 'text-ink-2 hover:bg-sunken')}>
            <Settings className="size-5" /> Konto & Einstellungen
          </NavLink>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-28 lg:pb-12">
        <div key={location.pathname} className="mx-auto w-full max-w-3xl animate-fade">
          <Outlet context={{ openSwitcher: () => setSwitcher(true) }} />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden" aria-label="Hauptnavigation">
        <div className="mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] grid grid-cols-5 items-center rounded-[1.75rem] border border-line/80 bg-surface/90 px-1.5 py-1.5 shadow-float backdrop-blur-xl">
          {nav.slice(0, 2).map((n) => <Tab key={n.to} {...n} />)}
          <div className="flex justify-center">
            <button
              aria-label="Schnell hinzufügen"
              onClick={() => setQuick(true)}
              className="flex size-13 items-center justify-center rounded-[1.25rem] bg-sage-600 text-white shadow-[0_8px_20px_-6px_rgb(78_107_87/0.7)] transition active:scale-90"
            >
              <Plus className="size-6" strokeWidth={2.4} />
            </button>
          </div>
          {nav.slice(2).map((n) => <Tab key={n.to} {...n} />)}
        </div>
      </nav>

      <Sheet open={quick} onClose={() => setQuick(false)} title="Was möchtest du tun?">
        <div className="grid grid-cols-1 gap-2.5">
          <QuickAction icon={Play} title={next ? `${next.plan.name} starten` : 'Training starten'} text={next ? 'Nächste geplante Einheit für heute' : 'Einen Trainingsplan auswählen'} onClick={() => go(next ? `/training/session/${next.plan.id}` : '/training')} accent />
          <QuickAction icon={NotebookPen} title="Tagebucheintrag" text={`Einen Moment mit ${dog.name} festhalten`} onClick={() => go('/diary?new=1')} />
          <QuickAction icon={Dumbbell} title="Neue Übung" text="Zur Übungsbibliothek hinzufügen" onClick={() => go('/training/exercises/new')} />
          <QuickAction icon={UserRound} title="Hund hinzufügen" text="Ein weiteres Profil anlegen" onClick={() => go('/dogs/new')} />
        </div>
      </Sheet>
      <DogSwitcher open={switcher} onClose={() => setSwitcher(false)} />
    </div>
  )
}

function Tab({ to, label, icon: Icon, end }: (typeof nav)[number]) {
  return (
    <NavLink to={to} end={end} className="group flex flex-col items-center gap-0.5 py-1.5">
      {({ isActive }) => (
        <>
          <span className={cn('flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300', isActive ? 'bg-sage-100 text-sage-700' : 'text-ink-3')}>
            <Icon className="size-[22px]" strokeWidth={isActive ? 2.3 : 1.9} />
          </span>
          <span className={cn('text-[11px] font-semibold transition-colors', isActive ? 'text-ink' : 'text-ink-3')}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

function QuickAction({ icon: Icon, title, text, onClick, accent }: { icon: typeof Plus; title: string; text: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className={cn('flex items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.98]', accent ? 'border-sage-600 bg-sage-600 text-white' : 'border-line bg-surface hover:border-line-strong')}>
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', accent ? 'bg-white/15' : 'bg-sage-100 text-sage-700')}>
        <Icon className={cn('size-5', accent && 'fill-current')} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold">{title}</span>
        <span className={cn('block text-sm', accent ? 'text-sage-100' : 'text-ink-3')}>{text}</span>
      </span>
    </button>
  )
}

export function Brand({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className={small ? 'size-8' : 'size-9'} />
      <span className="font-display text-xl font-medium tracking-tight text-sage-800">Doxie Diary</span>
    </div>
  )
}
