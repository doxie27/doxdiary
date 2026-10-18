import { Archive, ChevronDown, Play, Plus, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, EmptyState, SectionHeader } from '../../components/ui'
import type { TrainingPlan } from '../../data/types'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/AppStore'
import { estimateMinutes, todaysPlans } from '../../store/selectors'
import { TrainingTabs } from './TrainingTabs'
import { scheduleLabel, WeekdayDots } from './parts'

export function PlansPage() {
  const { state, dog } = useStore()
  const navigate = useNavigate()
  const [showArchived, setShowArchived] = useState(false)
  const plans = state.plans.filter((p) => p.dogId === dog.id)
  const active = plans.filter((p) => !p.archived)
  const archived = plans.filter((p) => p.archived)
  const next = todaysPlans(state, dog.id).find((t) => !t.done)

  return (
    <div>
      <PageHeader title="Training" eyebrow={`Physiotherapie mit ${dog.name}`} actions={<Button size="sm" variant="soft" icon={Plus} onClick={() => navigate('/training/plans/new')}>Neuer Plan</Button>} />
      <TrainingTabs />
      <div className="stagger space-y-7 px-5 lg:px-8">
        {next && (
          <section className="relative overflow-hidden rounded-[2rem] bg-sage-700 p-6 text-white shadow-float">
            <div className="absolute -right-10 -top-16 size-56 rounded-full bg-sage-500/40 blur-2xl" />
            <div className="relative">
              <p className="text-sm font-semibold text-sage-200">Als Nächstes · {next.plan.timeOfDay ?? 'heute'}</p>
              <h2 className="font-display mt-1 text-[1.75rem] leading-tight font-medium">{next.plan.name}</h2>
              <p className="mt-1 text-sm text-sage-100">
                {next.plan.items.length} Übungen · ca. {estimateMinutes(next.plan, state.exercises)} Minuten
              </p>
              <button onClick={() => navigate(`/training/session/${next.plan.id}`)} className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 font-semibold text-sage-800 transition active:scale-95">
                <Play className="size-4 fill-current" /> Training starten
              </button>
            </div>
          </section>
        )}

        <section>
          <SectionHeader title="Aktive Pläne" />
          {active.length === 0 ? (
            <EmptyState
              icon={<Plus className="size-6" />}
              title="Noch kein Trainingsplan"
              text={`Stelle Übungen zu einem Plan für ${dog.name} zusammen – zum Beispiel nach Vorgabe deiner Physiotherapeutin.`}
              action={<Button icon={Plus} onClick={() => navigate('/training/plans/new')}>Plan erstellen</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">{active.map((p) => <PlanCard key={p.id} plan={p} />)}</div>
          )}
        </section>

        {archived.length > 0 && (
          <section>
            <button onClick={() => setShowArchived((v) => !v)} className="flex w-full items-center justify-between px-1 py-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              <span className="flex items-center gap-2"><Archive className="size-4" /> Archiv ({archived.length})</span>
              <ChevronDown className={cn('size-4 transition-transform', showArchived && 'rotate-180')} />
            </button>
            {showArchived && <div className="mt-3 grid grid-cols-1 gap-3 opacity-80">{archived.map((p) => <PlanCard key={p.id} plan={p} />)}</div>}
          </section>
        )}

        <Card className="flex items-start gap-4 border-dashed bg-transparent p-5 shadow-none">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <Stethoscope className="size-5" />
          </span>
          <div>
            <div className="font-semibold">Bald: Pläne von deiner Physiotherapeutin</div>
            <p className="mt-1 text-sm text-ink-3">Später kann deine Praxis Trainingspläne direkt für {dog.name} bereitstellen – Fortschritte siehst nur du, bis du sie freigibst.</p>
          </div>
        </Card>
        <div className="h-2" />
      </div>
    </div>
  )
}

function PlanCard({ plan }: { plan: TrainingPlan }) {
  const { state } = useStore()
  const names = plan.items.map((i) => state.exercises.find((e) => e.id === i.exerciseId)?.name).filter(Boolean)
  return (
    <Link to={`/training/plans/${plan.id}`} className="block">
      <Card className="p-5 transition hover:border-line-strong active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl leading-snug">{plan.name}</h3>
            <p className="mt-0.5 text-sm text-ink-3">
              {scheduleLabel(plan.weekdays)}
              {plan.timeOfDay && ` · ${plan.timeOfDay} Uhr`} · ca. {estimateMinutes(plan, state.exercises)} Min.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-sunken px-2.5 py-1 text-xs font-semibold text-ink-2">{plan.items.length} Übungen</span>
        </div>
        <p className="mt-3 line-clamp-1 text-sm text-ink-2">{names.join(' · ')}</p>
        <div className="mt-4"><WeekdayDots days={plan.weekdays} /></div>
      </Card>
    </Link>
  )
}
