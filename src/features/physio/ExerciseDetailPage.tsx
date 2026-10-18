import { Info, Package, Pencil, Trash } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, IconButton, SectionHeader, Sheet, useToast } from '../../components/ui'
import { exerciseCategories } from '../../data/meta'
import { duration } from '../../lib/format'
import { useStore } from '../../store/AppStore'
import { CategoryBadge } from './parts'
import { ExerciseMedia } from './ExerciseMedia'

export function ExerciseDetailPage() {
  const { id } = useParams()
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const ex = state.exercises.find((e) => e.id === id)
  if (!ex) return <Navigate to="/training/exercises" replace />
  const plans = state.plans.filter((p) => p.items.some((i) => i.exerciseId === ex.id))

  const params = [
    { label: 'Sätze', value: ex.sets ? String(ex.sets) : null },
    { label: 'Wiederholungen', value: ex.reps ? String(ex.reps) : null },
    { label: 'Dauer', value: ex.durationSec ? duration(ex.durationSec) : null },
    { label: 'Pause', value: ex.restSec ? `${ex.restSec} Sek.` : null },
  ].filter((p) => p.value)

  return (
    <div className="pb-8">
      <PageHeader title={ex.name} back actions={<IconButton icon={Pencil} label="Bearbeiten" onClick={() => navigate(`/training/exercises/${ex.id}/edit`)} />} />
      <div className="space-y-7 px-5 lg:px-8">
        <div className="-mt-2"><CategoryBadge category={ex.category} /></div>
        <ExerciseMedia exercise={ex} className="aspect-[16/10]" />
        <p className="text-[17px] leading-relaxed text-ink-2">{ex.description}</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {params.map((p) => (
            <div key={p.label} className="rounded-tile bg-sunken/70 px-4 py-3.5">
              <div className="font-display text-2xl font-medium">{p.value}</div>
              <div className="text-xs font-semibold text-ink-3">{p.label}</div>
            </div>
          ))}
        </div>

        {ex.equipment.length > 0 && (
          <section>
            <SectionHeader title="Hilfsmittel" />
            <div className="flex flex-wrap gap-2">
              {ex.equipment.map((e) => (
                <span key={e} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium">
                  <Package className="size-4 text-ink-3" /> {e}
                </span>
              ))}
            </div>
          </section>
        )}

        {ex.notes && (
          <Card className="flex gap-3 border-honey-400/40 bg-honey-100/50 p-4 shadow-none">
            <Info className="mt-0.5 size-5 shrink-0 text-honey-600" />
            <p className="text-sm leading-relaxed text-ink-2">{ex.notes}</p>
          </Card>
        )}

        {plans.length > 0 && (
          <section>
            <SectionHeader title="Verwendet in" />
            <div className="flex flex-wrap gap-2">
              {plans.map((p) => (
                <button key={p.id} onClick={() => navigate(`/training/plans/${p.id}`)} className="rounded-full bg-sage-100 px-3.5 py-2 text-sm font-semibold text-sage-800">
                  {p.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <button onClick={() => setConfirm(true)} className="mx-auto flex items-center gap-2 py-2 text-sm font-semibold text-alert">
          <Trash className="size-4" /> Übung löschen
        </button>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Übung löschen?">
        <p className="text-ink-2">
          „{ex.name}“ wird aus der Bibliothek{plans.length ? ` und aus ${plans.length} ${plans.length === 1 ? 'Plan' : 'Plänen'}` : ''} entfernt. Der Trainingsverlauf bleibt erhalten.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-2.5">
          <Button variant="danger" block onClick={() => { dispatch({ type: 'deleteExercise', id: ex.id }); toast('Übung gelöscht'); navigate('/training/exercises', { replace: true }) }}>
            Endgültig löschen
          </Button>
          <Button variant="ghost" block onClick={() => setConfirm(false)}>Abbrechen</Button>
        </div>
      </Sheet>
    </div>
  )
}

export const categoryOptions = Object.entries(exerciseCategories).map(([value, m]) => ({ value, label: m.label }))
