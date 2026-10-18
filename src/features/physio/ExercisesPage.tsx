import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, EmptyState } from '../../components/ui'
import { exerciseCategories } from '../../data/meta'
import type { ExerciseCategory } from '../../data/types'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/AppStore'
import { TrainingTabs } from './TrainingTabs'
import { CategoryTile, ParamLine } from './parts'

export function ExercisesPage() {
  const { state, dog } = useStore()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<ExerciseCategory | null>(null)
  const list = useMemo(
    () =>
      state.exercises
        .filter((e) => (!cat || e.category === cat) && (e.name + e.description).toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [state.exercises, q, cat],
  )
  const usedIn = (id: string) => state.plans.filter((p) => !p.archived && p.items.some((i) => i.exerciseId === id)).length

  return (
    <div>
      <PageHeader title="Training" eyebrow={`Physiotherapie mit ${dog.name}`} actions={<Button size="sm" variant="soft" icon={Plus} onClick={() => navigate('/training/exercises/new')}>Neue Übung</Button>} />
      <TrainingTabs />
      <div className="space-y-4 px-5 lg:px-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${state.exercises.length} Übungen durchsuchen`} className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-4 focus:border-sage-400 focus:outline-none focus:ring-4 focus:ring-sage-100" />
        </div>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
          <FilterChip active={!cat} onClick={() => setCat(null)}>Alle</FilterChip>
          {(Object.keys(exerciseCategories) as ExerciseCategory[]).map((c) => {
            const m = exerciseCategories[c]
            return (
              <FilterChip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>
                <m.icon className="size-4" /> {m.label}
              </FilterChip>
            )
          })}
        </div>

        {list.length === 0 ? (
          <EmptyState icon={<Search className="size-6" />} title="Nichts gefunden" text="Passe die Suche an oder lege eine neue Übung an." action={<Button icon={Plus} onClick={() => navigate('/training/exercises/new')}>Neue Übung</Button>} />
        ) : (
          <div className="stagger grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2">
            {list.map((e) => {
              const n = usedIn(e.id)
              return (
                <Link key={e.id} to={`/training/exercises/${e.id}`}>
                  <Card className="flex h-full gap-4 p-4 transition hover:border-line-strong active:scale-[0.99]">
                    <CategoryTile category={e.category} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-snug">{e.name}</div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-ink-3">{e.description}</p>
                      <ParamLine {...e} className="mt-2 text-xs" />
                      {n > 0 && <div className="mt-2 text-xs font-semibold text-sage-600">In {n} {n === 1 ? 'Plan' : 'Plänen'}</div>}
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={cn('inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition active:scale-95', active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2')}>
      {children}
    </button>
  )
}
