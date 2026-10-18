import { ArrowDown, ArrowUp, Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, Sheet, Stepper, TextArea, TextField, useToast } from '../../components/ui'
import type { PlanItem, TrainingPlan, Weekday } from '../../data/types'
import { cn, uid } from '../../lib/cn'
import { weekdayShort } from '../../lib/format'
import { ApiError } from '../../api/client'
import { useStore } from '../../store/AppStore'
import { useLiveActions } from '../../store/useLiveActions'
import { estimateMinutes, resolveItem } from '../../store/selectors'
import { CategoryTile, ParamLine } from './parts'

export function PlanEditorPage() {
  const { id } = useParams()
  const { state, dog } = useStore()
  const { savePlan } = useLiveActions()
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const existing = state.plans.find((p) => p.id === id && p.dogId === dog.id)
  const [plan, setPlan] = useState<TrainingPlan>(
    () =>
      existing ?? {
        id: uid('plan'),
        dogId: dog.id,
        name: '',
        description: '',
        weekdays: [1, 2, 3, 4, 5],
        timeOfDay: '08:00',
        items: [],
        archived: false,
        source: { kind: 'owner', name: state.user.firstName },
        createdAt: new Date().toISOString(),
      },
  )
  const [picker, setPicker] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof TrainingPlan>(k: K, v: TrainingPlan[K]) => setPlan((p) => ({ ...p, [k]: v }))
  const setItem = (itemId: string, patch: Partial<PlanItem>) => set('items', plan.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)))
  const move = (index: number, dir: -1 | 1) => {
    const items = plan.items.slice()
    const [x] = items.splice(index, 1)
    items.splice(index + dir, 0, x)
    set('items', items)
  }
  const toggleDay = (d: Weekday) =>
    set('weekdays', plan.weekdays.includes(d) ? plan.weekdays.filter((x) => x !== d) : [...plan.weekdays, d].sort() as Weekday[])

  const save = () => {
    if (!plan.name.trim()) return setError('Gib dem Plan einen Namen.')
    if (plan.items.length === 0) return setError('Füge mindestens eine Übung hinzu.')
    setBusy(true)
    savePlan({ ...plan, name: plan.name.trim() })
      .then((saved) => {
        toast(existing ? 'Plan gespeichert' : 'Plan erstellt')
        navigate(`/training/plans/${saved.id}`, { replace: true })
      })
      .catch((e) => setError(e instanceof ApiError ? (Object.values(e.fields)[0] ?? e.message) : 'Speichern fehlgeschlagen.'))
      .finally(() => setBusy(false))
  }

  return (
    <div className="pb-44 lg:pb-10">
      <PageHeader title={existing ? 'Plan bearbeiten' : 'Neuer Plan'} eyebrow={`Für ${dog.name}`} back />
      <div className="space-y-6 px-5 lg:px-8">
        <TextField label="Name" value={plan.name} onChange={(e) => set('name', e.target.value)} placeholder={`z. B. ${dog.name}s tägliches Physiotraining`} maxLength={80} />
        <TextArea label="Beschreibung" hint="optional" value={plan.description} onChange={(e) => set('description', e.target.value)} placeholder="Ziel, Hinweise der Praxis, Zeitpunkt …" maxLength={400} />

        <fieldset>
          <legend className="mb-1.5 px-1 text-sm font-semibold text-ink-2">Trainingstage</legend>
          <div className="grid grid-cols-7 gap-1.5">
            {weekdayShort.map((l, i) => {
              const d = (i + 1) as Weekday
              const on = plan.weekdays.includes(d)
              return (
                <button key={l} type="button" aria-pressed={on} onClick={() => toggleDay(d)} className={cn('h-12 rounded-2xl text-sm font-semibold transition active:scale-90', on ? 'bg-sage-600 text-white' : 'border border-line bg-surface text-ink-3')}>
                  {l}
                </button>
              )
            })}
          </div>
        </fieldset>
        <TextField label="Uhrzeit" hint="optional – für die Tagesübersicht" type="time" value={plan.timeOfDay ?? ''} onChange={(e) => set('timeOfDay', e.target.value || null)} />

        <section>
          <div className="mb-2 flex items-end justify-between px-1">
            <h2 className="text-sm font-semibold text-ink-2">Übungen</h2>
            {plan.items.length > 0 && <span className="text-xs font-medium text-ink-3">ca. {estimateMinutes(plan, state.exercises)} Min.</span>}
          </div>
          <ol className="grid grid-cols-1 gap-2.5">
            {plan.items.map((it, i) => {
              const ex = state.exercises.find((e) => e.id === it.exerciseId)
              if (!ex) return null
              const r = resolveItem(it, ex)
              const open = expanded === it.id
              return (
                <li key={it.id} className="animate-rise">
                  <Card className="overflow-hidden">
                    <div className="flex items-center gap-3 p-3 pl-4">
                      <CategoryTile category={ex.category} size={40} />
                      <button type="button" onClick={() => setExpanded(open ? null : it.id)} className="min-w-0 flex-1 text-left">
                        <div className="truncate font-semibold">{ex.name}</div>
                        <ParamLine {...r} />
                      </button>
                      <div className="flex flex-col">
                        <button type="button" aria-label="Nach oben" disabled={i === 0} onClick={() => move(i, -1)} className="flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-sunken disabled:opacity-25">
                          <ArrowUp className="size-4" />
                        </button>
                        <button type="button" aria-label="Nach unten" disabled={i === plan.items.length - 1} onClick={() => move(i, 1)} className="flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-sunken disabled:opacity-25">
                          <ArrowDown className="size-4" />
                        </button>
                      </div>
                    </div>
                    <button type="button" onClick={() => setExpanded(open ? null : it.id)} className="flex w-full items-center justify-center gap-1 border-t border-line py-2 text-xs font-semibold text-ink-3">
                      Werte anpassen <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
                    </button>
                    {open && (
                      <div className="grid grid-cols-1 animate-fade gap-2 border-t border-line bg-sunken/40 p-3">
                        <Stepper label="Sätze" value={r.sets} min={1} max={10} onChange={(v) => setItem(it.id, { sets: v })} />
                        <Stepper label="Wiederholungen" value={r.reps} max={50} onChange={(v) => setItem(it.id, { reps: v })} />
                        <Stepper label="Dauer" unit="s" step={5} max={1800} value={r.durationSec} onChange={(v) => setItem(it.id, { durationSec: v })} />
                        <Stepper label="Pause" unit="s" step={5} max={600} value={r.restSec} onChange={(v) => setItem(it.id, { restSec: v })} />
                        <Button variant="ghost" size="sm" icon={X} className="justify-self-center text-alert" onClick={() => set('items', plan.items.filter((x) => x.id !== it.id))}>
                          Aus Plan entfernen
                        </Button>
                      </div>
                    )}
                  </Card>
                </li>
              )
            })}
          </ol>
          <Button variant="secondary" icon={Plus} block className="mt-3 border-dashed" onClick={() => setPicker(true)}>
            Übung hinzufügen
          </Button>
        </section>

        {error && <p role="alert" className="rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-[84px] z-30 bg-gradient-to-t from-canvas via-canvas/95 to-transparent px-5 pb-3 pt-6 lg:static lg:mt-8 lg:bg-none lg:p-0 lg:px-8">
        <Button size="lg" block icon={Check} className="shadow-float" onClick={save} disabled={busy}>
          {existing ? 'Änderungen speichern' : 'Plan erstellen'}
        </Button>
      </div>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(exerciseId) => {
          set('items', [...plan.items, { id: uid('item'), exerciseId, reps: null, sets: null, durationSec: null, restSec: null }])
          setError(null)
        }}
        selected={plan.items.map((i) => i.exerciseId)}
      />
    </div>
  )
}

function ExercisePicker({ open, onClose, onPick, selected }: { open: boolean; onClose: () => void; onPick: (id: string) => void; selected: string[] }) {
  const { state } = useStore()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const list = useMemo(() => state.exercises.filter((e) => e.name.toLowerCase().includes(q.toLowerCase())), [state.exercises, q])
  return (
    <Sheet open={open} onClose={onClose} title="Übung hinzufügen">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Übung suchen" className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-4 focus:border-sage-400 focus:outline-none focus:ring-4 focus:ring-sage-100" />
      </div>
      <div className="grid grid-cols-1 gap-2">
        {list.map((e) => {
          const count = selected.filter((s) => s === e.id).length
          return (
            <button key={e.id} onClick={() => onPick(e.id)} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition active:scale-[0.98] hover:border-line-strong">
              <CategoryTile category={e.category} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{e.name}</div>
                <ParamLine {...e} />
              </div>
              {count > 0 ? (
                <span className="flex size-7 animate-pop items-center justify-center rounded-full bg-sage-600 text-xs font-bold text-white">{count}×</span>
              ) : (
                <Plus className="size-5 text-ink-3" />
              )}
            </button>
          )
        })}
        <IconLink onClick={() => { onClose(); navigate('/training/exercises/new') }} />
      </div>
    </Sheet>
  )
}

function IconLink({ onClick }: { onClick: () => void }) {
  return (
    <p className="mt-3 text-center text-sm text-ink-3">
      Fehlt etwas?{' '}
      <button onClick={onClick} className="font-semibold text-sage-600">
        Neue Übung anlegen
      </button>
    </p>
  )
}
