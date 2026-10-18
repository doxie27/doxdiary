import { ChevronDown, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card, IconButton, SectionHeader, Segmented } from '../../components/ui'
import { feedbackMeta } from '../../data/meta'
import type { ExerciseFeedback, TrainingSession } from '../../data/types'
import { addDays, dayKey, isoWeekday, startOfDay } from '../../lib/date'
import { cn } from '../../lib/cn'
import { duration, fmt, relativeDay, weekdayShort } from '../../lib/format'
import { useStore } from '../../store/AppStore'
import { currentStreak, dogSessions, feedbackCounts, weeklyStats } from '../../store/selectors'
import { TrainingTabs } from './TrainingTabs'

export function HistoryPage() {
  const { state, dog } = useStore()
  const sessions = dogSessions(state, dog.id)
  const now = new Date()
  const last30 = sessions.filter((s) => new Date(s.startedAt) >= addDays(startOfDay(now), -29))
  const weeks = weeklyStats(sessions, 8, now)
  const avg = weeks.slice(0, -1).reduce((a, w) => a + w.sessions, 0) / Math.max(1, weeks.length - 1)

  return (
    <div>
      <PageHeader title="Training" eyebrow={`Physiotherapie mit ${dog.name}`} />
      <TrainingTabs />
      <div className="stagger space-y-7 px-5 pb-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi value={last30.length} label="Einheiten" sub="letzte 30 Tage" />
          <Kpi value={Math.round(last30.reduce((a, s) => a + s.activeSec, 0) / 60)} label="Minuten aktiv" sub="letzte 30 Tage" />
          <Kpi value={currentStreak(sessions, now)} label="Tage in Folge" sub="aktuelle Serie" />
          <Kpi value={fmt.num(avg)} label="pro Woche" sub="Ø der letzten 7 Wo." />
        </div>

        <CalendarCard sessions={sessions} />
        <WeeklyChart weeks={weeks} />
        <FeedbackBar sessions={last30} />

        <section>
          <SectionHeader title="Vergangene Einheiten" />
          <div className="grid grid-cols-1 gap-2.5">
            {sessions.slice(0, 12).map((s) => <SessionRow key={s.id} s={s} />)}
          </div>
        </section>

        <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-3">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Die Auswertungen zeigen ausschließlich eure Trainingsaktivität und deine eigenen Beobachtungen – keine Aussage über den Gesundheitszustand.
        </p>
      </div>
    </div>
  )
}

function Kpi({ value, label, sub }: { value: number | string; label: string; sub: string }) {
  return (
    <Card className="p-4">
      <div className="font-display text-3xl font-medium tabular-nums">{value}</div>
      <div className="mt-0.5 text-sm font-semibold">{label}</div>
      <div className="text-xs text-ink-3">{sub}</div>
    </Card>
  )
}

/** Monatskalender; Intensität = Anzahl Einheiten am Tag (sequenzielle Salbei-Skala). */
function CalendarCard({ sessions }: { sessions: TrainingSession[] }) {
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const now = new Date()
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const byDay = useMemo(() => {
    const m = new Map<string, TrainingSession[]>()
    for (const s of sessions) {
      const k = dayKey(s.startedAt)
      m.set(k, [...(m.get(k) ?? []), s])
    }
    return m
  }, [sessions])
  const lead = isoWeekday(month) - 1
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: lead + daysInMonth }, (_, i) => (i < lead ? null : new Date(month.getFullYear(), month.getMonth(), i - lead + 1)))
  const monthCount = cells.reduce((a, d) => a + (d ? byDay.get(dayKey(d))?.length ?? 0 : 0), 0)
  const sel = selected ? byDay.get(selected) : undefined

  return (
    <section>
      <SectionHeader title="Kalender" />
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <IconButton icon={ChevronLeft} label="Vorheriger Monat" variant="ghost" onClick={() => { setOffset((o) => o - 1); setSelected(null) }} />
          <div className="text-center">
            <div className="font-semibold capitalize">{fmt.monthYear(month)}</div>
            <div className="text-xs text-ink-3">{monthCount} Einheiten</div>
          </div>
          <IconButton icon={ChevronRight} label="Nächster Monat" variant="ghost" disabled={offset >= 0} className="disabled:opacity-30" onClick={() => { setOffset((o) => o + 1); setSelected(null) }} />
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdayShort.map((w) => <div key={w} className="pb-1 text-[11px] font-semibold text-ink-3">{w}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />
            const k = dayKey(d)
            const n = byDay.get(k)?.length ?? 0
            const today = k === dayKey(now)
            const future = d > now
            return (
              <button
                key={k}
                disabled={!n}
                onClick={() => setSelected(selected === k ? null : k)}
                aria-label={`${fmt.dateLong(d)}: ${n} Einheiten`}
                className={cn(
                  'relative mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition',
                  n === 0 && (future ? 'text-ink-3/50' : 'text-ink-3'),
                  n === 1 && 'bg-sage-200 text-sage-800',
                  n >= 2 && 'bg-sage-600 text-white',
                  today && 'ring-2 ring-ink ring-offset-1 ring-offset-surface',
                  selected === k && 'scale-110 shadow-card',
                )}
              >
                {d.getDate()}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex items-center justify-end gap-3 text-[11px] font-semibold text-ink-3">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-sage-200" /> 1 Einheit</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-sage-600" /> 2+</span>
        </div>
        {sel && (
          <div className="mt-3 grid grid-cols-1 animate-fade gap-2 border-t border-line pt-3">
            {sel.map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="font-semibold">{s.planName}</span>
                <span className="text-ink-3">{fmt.time(s.startedAt)} · {duration(Math.max(60, s.activeSec))}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  )
}

/** Balkendiagramm pro Woche – ein Maß zur Zeit (Umschalter statt zweiter Achse). */
function WeeklyChart({ weeks }: { weeks: ReturnType<typeof weeklyStats> }) {
  const [measure, setMeasure] = useState<'sessions' | 'minutes'>('sessions')
  const [hover, setHover] = useState<number | null>(null)
  const values = weeks.map((w) => w[measure])
  const max = Math.max(1, ...values)
  const niceMax = measure === 'sessions' ? Math.max(4, Math.ceil(max / 2) * 2) : Math.ceil(max / 20) * 20 || 20
  const ticks = [0, niceMax / 2, niceMax]
  const H = 150
  const active = hover ?? weeks.length - 1
  const unit = measure === 'sessions' ? 'Einheiten' : 'Minuten'

  return (
    <section>
      <SectionHeader title="Trainingshäufigkeit" />
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-display text-3xl font-medium tabular-nums">{values[active]} <span className="font-sans text-base font-semibold text-ink-3">{unit}</span></div>
            <div className="text-sm text-ink-3">{active === weeks.length - 1 ? 'Diese Woche' : `Woche ab ${fmt.dateShort(weeks[active].start)}`}</div>
          </div>
          <Segmented className="w-52" value={measure} onChange={setMeasure} options={[{ value: 'sessions', label: 'Einheiten' }, { value: 'minutes', label: 'Minuten' }]} />
        </div>
        <div className="relative mt-6 flex gap-2" onMouseLeave={() => setHover(null)}>
          <div className="relative w-6 shrink-0 text-right text-[11px] font-medium tabular-nums text-ink-3" style={{ height: H }}>
            {ticks.map((t) => <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: H - (t / niceMax) * H }}>{t}</span>)}
          </div>
          <div className="relative flex-1">
            {ticks.map((t) => <div key={t} className="absolute inset-x-0 border-t border-line" style={{ top: H - (t / niceMax) * H }} />)}
            <div className="relative grid items-end gap-2" style={{ height: H, gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
              {weeks.map((w, i) => {
                const v = values[i]
                const current = i === weeks.length - 1
                return (
                  <button
                    key={i}
                    className="group relative flex h-full items-end justify-center"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onClick={() => setHover(i)}
                    aria-label={`Woche ab ${fmt.dateShort(w.start)}: ${v} ${unit}`}
                  >
                    <span
                      className={cn('w-full max-w-7 rounded-t-[4px] transition-all duration-500', current ? 'bg-sage-600' : 'bg-sage-300', active === i && !current && 'bg-sage-400')}
                      style={{ height: `${Math.max(v ? 3 : 0, (v / niceMax) * 100)}%` }}
                    />
                    {hover === i && (
                      <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs font-semibold text-white shadow-float">
                        {v} {unit}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-2 grid gap-2 text-center text-[11px] font-medium text-ink-3" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
              {weeks.map((w, i) => <span key={i}>{i === weeks.length - 1 ? 'Jetzt' : fmt.dateShort(w.start).replace('.', '')}</span>)}
            </div>
          </div>
        </div>
      </Card>
    </section>
  )
}

/** Verteilung deiner Rückmeldungen – Statusfarben immer mit Icon und Text. */
function FeedbackBar({ sessions }: { sessions: TrainingSession[] }) {
  const c = feedbackCounts(sessions)
  const keys = Object.keys(feedbackMeta) as ExerciseFeedback[]
  const total = keys.reduce((a, k) => a + c[k], 0)
  if (!total) return null
  const colors: Record<ExerciseFeedback, string> = { good: 'bg-good', hard: 'bg-honey-400', issue: 'bg-alert' }
  return (
    <section>
      <SectionHeader title="Deine Beobachtungen · 30 Tage" />
      <Card className="p-5">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
          {keys.map((k) => c[k] > 0 && <span key={k} className={cn('h-full first:rounded-l-full last:rounded-r-full', colors[k])} style={{ width: `${(c[k] / total) * 100}%` }} title={`${feedbackMeta[k].label}: ${c[k]}`} />)}
        </div>
        <ul className="mt-4 grid gap-2.5">
          {keys.map((k) => {
            const m = feedbackMeta[k]
            return (
              <li key={k} className="flex items-center gap-3 text-sm">
                <span className={cn('flex size-8 items-center justify-center rounded-lg', m.tint)}><m.icon className="size-4" /></span>
                <span className="flex-1 font-medium text-ink-2">{m.label}</span>
                <span className="font-semibold tabular-nums">{c[k]}</span>
                <span className="w-10 text-right text-ink-3 tabular-nums">{Math.round((c[k] / total) * 100)} %</span>
              </li>
            )
          })}
        </ul>
        {c.skipped > 0 && <p className="mt-3 text-xs text-ink-3">{c.skipped} Übungen übersprungen</p>}
      </Card>
    </section>
  )
}

function SessionRow({ s }: { s: TrainingSession }) {
  const { state } = useStore()
  const [open, setOpen] = useState(false)
  const done = s.results.filter((r) => r.status === 'done').length
  const issue = s.results.some((r) => r.feedback === 'issue')
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-4 p-4 text-left" aria-expanded={open}>
        <div className="flex w-12 shrink-0 flex-col items-center">
          <span className="text-[11px] font-semibold uppercase text-ink-3">{weekdayShort[isoWeekday(new Date(s.startedAt)) - 1]}</span>
          <span className="font-display text-xl">{new Date(s.startedAt).getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{s.planName}</div>
          <div className="text-sm text-ink-3">{relativeDay(s.startedAt)} · {fmt.time(s.startedAt)} Uhr · {done}/{s.results.length} Übungen</div>
        </div>
        {issue && <feedbackMeta.issue.icon className="size-4 text-alert" aria-label="Beschwerden notiert" />}
        <ChevronDown className={cn('size-4 text-ink-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="animate-fade border-t border-line bg-sunken/40 px-4 py-3">
          <ul className="grid grid-cols-1 gap-2">
            {s.results.map((r) => {
              const ex = state.exercises.find((e) => e.id === r.exerciseId)
              const m = r.feedback ? feedbackMeta[r.feedback] : null
              return (
                <li key={r.itemId} className="text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn('font-medium', r.status === 'skipped' && 'text-ink-3 line-through')}>{ex?.name ?? 'Gelöschte Übung'}</span>
                    {m ? <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', m.tint)}><m.icon className="size-3" />{m.short}</span> : <span className="text-xs text-ink-3">übersprungen</span>}
                  </div>
                  {r.note && <p className="mt-0.5 text-ink-3">„{r.note}“</p>}
                </li>
              )
            })}
          </ul>
          {s.note && <p className="mt-3 border-t border-line pt-3 text-sm text-ink-2">{s.note}</p>}
        </div>
      )}
    </Card>
  )
}
