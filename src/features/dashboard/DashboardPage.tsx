import { ArrowUpRight, BookHeart, CalendarDays, Check, ChevronDown, Clock, Dumbbell, Flame, Library, NotebookPen, Play, Sunrise } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useShell } from '../../components/layout/useShell'
import { Card, DogBackdrop, DogPortrait, SectionHeader } from '../../components/ui'
import { diaryCategories } from '../../data/meta'
import { ageFrom, addDays, dayKey, isoWeekday, startOfWeek } from '../../lib/date'
import { cn } from '../../lib/cn'
import { fmt, greeting, relativeDay, weekdayShort } from '../../lib/format'
import { useStore } from '../../store/AppStore'
import { activePlans, currentStreak, dogSessions, estimateMinutes, todaysPlans, weekAdherence, weeklyStats } from '../../store/selectors'

export function DashboardPage() {
  const { state, dog } = useStore()
  const { openSwitcher } = useShell()
  const navigate = useNavigate()
  const now = new Date()
  const sessions = dogSessions(state, dog.id)
  const today = todaysPlans(state, dog.id, now)
  const adherence = weekAdherence(state, dog.id, now)
  const week = weeklyStats(sessions, 1, now)[0]
  const streakDays = currentStreak(sessions, now)
  const age = ageFrom(dog.birthDate, now)
  const diary = state.diary.filter((e) => e.dogId === dog.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 2)
  const multiple = state.dogs.length > 1

  return (
    <div className="stagger space-y-7 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-8 lg:pt-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium capitalize text-ink-3">{fmt.dateLong(now)}</p>
          <h1 className="font-display text-[1.75rem] leading-tight font-medium lg:text-4xl">
            {greeting(now)}, {state.user.firstName}
          </h1>
        </div>
        <Link to="/account" aria-label="Konto" className="flex size-11 items-center justify-center rounded-full bg-sage-100 font-semibold text-sage-700 transition active:scale-90 lg:hidden">
          {state.user.firstName.charAt(0)}
        </Link>
      </header>

      {/* Hero: der Hund im Mittelpunkt */}
      <section className="relative isolate overflow-hidden rounded-[2rem] shadow-card">
        <DogBackdrop dog={dog} className="-z-10" />
        <div className="flex min-h-56 flex-col justify-between p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <DogPortrait dog={dog} size={64} ring />
            {multiple && (
              <button onClick={openSwitcher} className="flex h-9 items-center gap-1 rounded-full bg-white/55 pl-3.5 pr-2.5 text-sm font-semibold text-ink backdrop-blur-md transition active:scale-95">
                Hund wechseln <ChevronDown className="size-4" />
              </button>
            )}
          </div>
          <div className={cn('mt-6', dog.photoUrl ? 'text-white' : 'text-ink')}>
            <Link to="/dog" className="group inline-flex items-center gap-1.5">
              <h2 className="font-display text-[2.6rem] leading-none font-medium">{dog.name}</h2>
              <ArrowUpRight className="size-5 opacity-50 transition group-hover:opacity-100" />
            </Link>
            <p className="mt-1.5 text-sm font-medium opacity-75">
              {dog.breed} · {age.years} Jahre{age.months ? `, ${age.months} Mon.` : ''} · {fmt.num(dog.weightKg)} kg
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px border-t border-white/40 bg-white/30 backdrop-blur-md">
          <HeroStat icon={Flame} value={streakDays} label={streakDays === 1 ? 'Tag in Folge' : 'Tage in Folge'} />
          <HeroStat icon={CalendarDays} value={`${adherence.done}/${adherence.planned}`} label="Einheiten Woche" />
          <HeroStat icon={Clock} value={week.minutes} label="Min. aktiv" />
        </div>
      </section>

      {/* Heute */}
      <section>
        <SectionHeader title="Heute" action="Alle Pläne" to="/training" />
        {today.length === 0 ? (
          <Card className="flex items-center gap-4 p-5">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-honey-100 text-honey-600">
              <Sunrise className="size-6" />
            </span>
            <div>
              <div className="font-semibold">Heute ist Ruhetag</div>
              <p className="text-sm text-ink-3">Für {dog.name} ist heute kein Training geplant.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {today.map(({ plan, done }) => (
              <Card key={plan.id} className={cn('flex items-center gap-4 p-4', done && 'bg-sage-50/60')}>
                <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-sunken py-2">
                  <span className="text-[11px] font-semibold uppercase text-ink-3">Uhr</span>
                  <span className="text-[15px] font-semibold tabular-nums">{plan.timeOfDay ?? '–'}</span>
                </div>
                <Link to={`/training/plans/${plan.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{plan.name}</div>
                  <div className="text-sm text-ink-3">
                    {done ? `Erledigt um ${fmt.time(done.finishedAt)}` : `${plan.items.length} Übungen · ca. ${estimateMinutes(plan, state.exercises)} Min.`}
                  </div>
                </Link>
                {done ? (
                  <span className="flex size-12 animate-pop items-center justify-center rounded-full bg-sage-600 text-white" aria-label="Erledigt">
                    <Check className="size-5" strokeWidth={3} />
                  </span>
                ) : (
                  <button
                    onClick={() => navigate(`/training/session/${plan.id}`)}
                    aria-label={`${plan.name} starten`}
                    className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white shadow-[0_6px_16px_-6px_rgb(78_107_87/0.7)] transition active:scale-90"
                  >
                    <Play className="ml-0.5 size-5 fill-current" />
                  </button>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <WeekStrip />

      {/* Letzte Einträge */}
      <section>
        <SectionHeader title="Zuletzt" action="Tagebuch" to="/diary" />
        <div className="grid grid-cols-1 gap-3">
          {!sessions[0] && diary.length === 0 && (
            <Card className="p-5 text-sm text-ink-3 shadow-none">
              Hier erscheinen eure letzten Trainingseinheiten und Tagebucheinträge. Leg los mit einem{' '}
              <Link to="/training/plans/new" className="font-semibold text-sage-600">Trainingsplan</Link> oder einem{' '}
              <Link to="/diary?new=1" className="font-semibold text-sage-600">ersten Eintrag</Link>.
            </Card>
          )}
          {sessions[0] && (
            <Link to="/training/history" className="block">
              <Card className="flex items-center gap-4 p-4 transition hover:border-line-strong">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-sage-700">
                  <Dumbbell className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{sessions[0].planName}</div>
                  <div className="text-sm text-ink-3">
                    {relativeDay(sessions[0].startedAt)} · {sessions[0].results.filter((r) => r.status === 'done').length} von {sessions[0].results.length} Übungen
                  </div>
                </div>
              </Card>
            </Link>
          )}
          {diary.map((e) => {
            const m = diaryCategories[e.category]
            return (
              <Link key={e.id} to="/diary" className="block">
                <Card className="flex items-center gap-4 p-4 transition hover:border-line-strong">
                  <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', m.tint)}>
                    <m.icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{e.title}</div>
                    <div className="truncate text-sm text-ink-3">
                      {relativeDay(e.at)} · {e.text}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Schnellzugriff */}
      <section className="pb-4">
        <SectionHeader title="Schnellzugriff" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Shortcut to="/diary?new=1" icon={NotebookPen} label="Neuer Eintrag" tint="bg-honey-100 text-honey-600" />
          <Shortcut to="/training/exercises" icon={Library} label="Übungen" tint="bg-sky-100 text-sky-600" />
          <Shortcut to="/training/history" icon={CalendarDays} label="Verlauf" tint="bg-sage-100 text-sage-700" />
          <Shortcut to="/diary" icon={BookHeart} label="Tagebuch" tint="bg-clay-100 text-clay-600" />
        </div>
      </section>
    </div>
  )
}

function HeroStat({ icon: Icon, value, label }: { icon: typeof Flame; value: number | string; label: string }) {
  return (
    <div className="bg-white/35 px-3 py-3 text-ink">
      <div className="flex items-center gap-1.5">
        <Icon className="size-4 opacity-60" />
        <span className="text-lg font-semibold tabular-nums">{value}</span>
      </div>
      <div className="text-[11px] font-semibold opacity-60">{label}</div>
    </div>
  )
}

function Shortcut({ to, icon: Icon, label, tint }: { to: string; icon: typeof Flame; label: string; tint: string }) {
  return (
    <Link to={to} className="flex flex-col gap-3 rounded-tile border border-line/70 bg-surface p-4 shadow-card transition active:scale-[0.97] hover:border-line-strong">
      <span className={cn('flex size-10 items-center justify-center rounded-xl', tint)}>
        <Icon className="size-5" />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  )
}

/** Mo–So mit Status je Tag: erledigt, geplant oder Ruhetag. */
function WeekStrip() {
  const { state, dog } = useStore()
  const now = new Date()
  const start = startOfWeek(now)
  const doneDays = new Set(dogSessions(state, dog.id).map((s) => dayKey(s.startedAt)))
  const plans = activePlans(state, dog.id)
  return (
    <section>
      <SectionHeader title="Diese Woche" action="Verlauf" to="/training/history" />
      <Card className="grid grid-cols-7 gap-1 p-3">
        {weekdayShort.map((label, i) => {
          const d = addDays(start, i)
          const isToday = dayKey(d) === dayKey(now)
          const done = doneDays.has(dayKey(d))
          const planned = plans.some((p) => p.weekdays.includes(isoWeekday(d)))
          const future = d > now && !isToday
          return (
            <div key={label} className={cn('flex flex-col items-center gap-2 rounded-2xl py-2.5', isToday && 'bg-sunken')}>
              <span className={cn('text-[11px] font-semibold', isToday ? 'text-ink' : 'text-ink-3')}>{label}</span>
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                  done && 'bg-sage-600 text-white',
                  !done && planned && !future && !isToday && 'border-2 border-dashed border-line-strong text-ink-3',
                  !done && planned && (future || isToday) && 'border-2 border-sage-300 text-sage-700',
                  !done && !planned && 'text-ink-3',
                )}
                title={done ? 'Training erledigt' : planned ? (future ? 'Geplant' : isToday ? 'Heute geplant' : 'Nicht trainiert') : 'Ruhetag'}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : d.getDate()}
              </span>
            </div>
          )
        })}
      </Card>
    </section>
  )
}
