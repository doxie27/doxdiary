import { Archive, ArchiveRestore, Pencil, Play, Trash } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, IconButton, SectionHeader, Sheet, useToast } from '../../components/ui'
import { fmt, relativeDay } from '../../lib/format'
import { useStore } from '../../store/AppStore'
import { useLiveActions } from '../../store/useLiveActions'
import { dogSessions, estimateMinutes, resolveItem } from '../../store/selectors'
import { CategoryTile, ParamLine, scheduleLabel, WeekdayDots } from './parts'

export function PlanDetailPage() {
  const { id } = useParams()
  const { state, dog } = useStore()
  const { savePlan, removePlan } = useLiveActions()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const plan = state.plans.find((p) => p.id === id)
  // Berechtigungsprüfung im Kleinen: nur Pläne des aktuell gewählten Hundes
  if (!plan || plan.dogId !== dog.id) return <Navigate to="/training" replace />

  const history = dogSessions(state, dog.id).filter((s) => s.planId === plan.id).slice(0, 4)

  return (
    <div className="pb-44 lg:pb-8">
      <PageHeader
        title={plan.name}
        eyebrow={plan.archived ? 'Archivierter Plan' : 'Trainingsplan'}
        back="/training"
        actions={
          <>
            <IconButton
              icon={plan.archived ? ArchiveRestore : Archive}
              label={plan.archived ? 'Wiederherstellen' : 'Archivieren'}
              onClick={() => {
                savePlan({ ...plan, archived: !plan.archived })
                  .then(() => toast(plan.archived ? 'Plan wiederhergestellt' : 'Plan archiviert'))
                  .catch((e: Error) => toast(e.message))
              }}
            />
            <IconButton icon={Pencil} label="Bearbeiten" onClick={() => navigate(`/training/plans/${plan.id}/edit`)} />
          </>
        }
      />
      <div className="space-y-7 px-5 lg:px-8">
        {plan.description && <p className="-mt-1 leading-relaxed text-ink-2">{plan.description}</p>}

        <Card className="flex items-center justify-between gap-4 p-4">
          <div>
            <div className="text-sm font-semibold">{scheduleLabel(plan.weekdays)}</div>
            <div className="text-sm text-ink-3">
              {plan.timeOfDay ? `${plan.timeOfDay} Uhr · ` : ''}ca. {estimateMinutes(plan, state.exercises)} Minuten
            </div>
          </div>
          <WeekdayDots days={plan.weekdays} />
        </Card>

        <section>
          <SectionHeader title={`${plan.items.length} Übungen`} />
          <ol className="stagger grid grid-cols-1 gap-2.5">
            {plan.items.map((it, i) => {
              const ex = state.exercises.find((e) => e.id === it.exerciseId)
              if (!ex) return null
              return (
                <li key={it.id}>
                  <Link to={`/training/exercises/${ex.id}`}>
                    <Card className="flex items-center gap-4 p-4 transition hover:border-line-strong">
                      <span className="w-5 text-center font-display text-lg text-ink-3">{i + 1}</span>
                      <CategoryTile category={ex.category} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{ex.name}</div>
                        <ParamLine {...resolveItem(it, ex)} />
                      </div>
                    </Card>
                  </Link>
                </li>
              )
            })}
          </ol>
        </section>

        {history.length > 0 && (
          <section>
            <SectionHeader title="Letzte Einheiten" action="Verlauf" to="/training/history" />
            <Card className="divide-y divide-line">
              {history.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3.5 text-sm">
                  <span className="font-semibold">{relativeDay(s.startedAt)}</span>
                  <span className="text-ink-3">
                    {fmt.time(s.startedAt)} Uhr · {s.results.filter((r) => r.status === 'done').length}/{s.results.length} erledigt
                  </span>
                </div>
              ))}
            </Card>
          </section>
        )}

        <button onClick={() => setConfirmDelete(true)} className="mx-auto flex items-center gap-2 py-2 text-sm font-semibold text-alert">
          <Trash className="size-4" /> Plan löschen
        </button>
      </div>

      {!plan.archived && plan.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-[84px] z-30 bg-gradient-to-t from-canvas via-canvas/95 to-transparent px-5 pb-3 pt-6 lg:static lg:mt-6 lg:bg-none lg:p-0 lg:px-8">
          <Button size="lg" block icon={Play} className="shadow-float" onClick={() => navigate(`/training/session/${plan.id}`)}>
            Training starten
          </Button>
        </div>
      )}

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Plan löschen?">
        <p className="text-ink-2">Der Plan wird entfernt. Bereits abgeschlossene Einheiten bleiben im Verlauf erhalten. Tipp: Mit „Archivieren“ kannst du ihn stattdessen aufbewahren.</p>
        <div className="mt-6 grid grid-cols-1 gap-2.5">
          <Button
            variant="danger"
            block
            onClick={() => {
              removePlan(plan.id)
                .then(() => {
                  toast('Plan gelöscht')
                  navigate('/training', { replace: true })
                })
                .catch((e: Error) => toast(e.message))
            }}
          >
            Endgültig löschen
          </Button>
          <Button variant="ghost" block onClick={() => setConfirmDelete(false)}>Abbrechen</Button>
        </div>
      </Sheet>
    </div>
  )
}
