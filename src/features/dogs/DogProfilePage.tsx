import { Cake, ChevronLeft, Dumbbell, Lock, Mars, NotebookPen, Pencil, Scale, ShieldCheck, Sparkles, Trash, Venus } from 'lucide-react'
import { ApiError } from '../../api/client'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useShell } from '../../components/layout/useShell'
import { Button, Card, DogBackdrop, DogPortrait, IconButton, SectionHeader, Sheet, useToast } from '../../components/ui'
import { ageFrom } from '../../lib/date'
import { cn } from '../../lib/cn'
import { fmt } from '../../lib/format'
import { useStore } from '../../store/AppStore'
import { activePlans, dogSessions, estimateMinutes } from '../../store/selectors'
import { useDogActions } from '../../store/useDogActions'
import { DogForm } from './DogForm'

export function DogProfilePage() {
  const { state, dog } = useStore()
  const { openSwitcher } = useShell()
  const { save, remove } = useDogActions()
  const [edit, setEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const toast = useToast()
  const navigate = useNavigate()
  const age = ageFrom(dog.birthDate)
  const sessions = dogSessions(state, dog.id)
  const entries = state.diary.filter((e) => e.dogId === dog.id).length
  const plans = activePlans(state, dog.id)
  const onPhoto = !!dog.photoUrl
  const since = sessions.at(-1)?.startedAt

  return (
    <div>
      <section className="relative isolate overflow-hidden lg:mx-8 lg:mt-10 lg:rounded-[2rem]">
        <DogBackdrop dog={dog} className="-z-10" />
        <div className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] lg:pt-5">
          <IconButton icon={ChevronLeft} label="Zurück" variant="glass" onClick={() => navigate('/')} />
          <div className="flex gap-2">
            {state.dogs.length > 1 && (
              <button onClick={openSwitcher} className="h-11 rounded-full bg-white/55 px-4 text-sm font-semibold backdrop-blur-md active:scale-95">
                Wechseln
              </button>
            )}
            <IconButton icon={Pencil} label="Profil bearbeiten" variant="glass" onClick={() => setEdit(true)} />
          </div>
        </div>
        <div className={cn('flex flex-col items-center px-6 pb-16 pt-6 text-center', onPhoto ? 'text-white' : 'text-ink')}>
          <DogPortrait dog={dog} size={132} ring className="shadow-float" />
          <h1 className="font-display mt-5 text-5xl font-medium">{dog.name}</h1>
          <p className="mt-1.5 font-medium opacity-75">{dog.breed}</p>
        </div>
      </section>

      <div className="relative -mt-8 space-y-7 px-5 lg:px-8">
        <Card className="stagger grid grid-cols-3 divide-x divide-line p-1">
          <Fact icon={Cake} label="Alter" value={`${age.years} J.${age.months ? ` ${age.months} M.` : ''}`} />
          <Fact icon={Scale} label="Gewicht" value={`${fmt.num(dog.weightKg)} kg`} />
          <Fact icon={dog.sex === 'female' ? Venus : Mars} label={dog.neutered ? 'Kastriert' : dog.neutered === false ? 'Unkastriert' : 'Geschlecht'} value={dog.sex === 'female' ? 'Hündin' : 'Rüde'} />
        </Card>

        {dog.bio && (
          <blockquote className="px-2 text-center">
            <Sparkles className="mx-auto mb-3 size-5 text-honey-400" />
            <p className="font-display text-xl leading-relaxed text-ink-2 italic">„{dog.bio}“</p>
          </blockquote>
        )}

        <section>
          <SectionHeader title={`Mit ${dog.name}`} />
          <div className="grid grid-cols-3 gap-3">
            <Stat value={sessions.length} label="Einheiten" />
            <Stat value={entries} label="Einträge" />
            <Stat value={since ? fmt.monthYear(since).split(' ')[0] : '–'} label="Dabei seit" />
          </div>
        </section>

        {dog.healthNotes && (
          <section>
            <SectionHeader title="Gesundheit" />
            <Card className="p-5">
              <p className="leading-relaxed text-ink-2">{dog.healthNotes}</p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-ink-3">
                <Lock className="size-3.5" /> Nur für dich sichtbar
              </div>
            </Card>
          </section>
        )}

        <section>
          <SectionHeader title="Aktive Trainingspläne" action="Training" to="/training" />
          <div className="grid grid-cols-1 gap-3">
            {plans.map((p) => (
              <Link key={p.id} to={`/training/plans/${p.id}`}>
                <Card className="flex items-center gap-4 p-4 transition hover:border-line-strong">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-sage-100 text-sage-700">
                    <Dumbbell className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="text-sm text-ink-3">
                      {p.items.length} Übungen · ca. {estimateMinutes(p, state.exercises)} Min.
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="pb-6">
          <Card className="flex items-start gap-3 bg-sunken/60 p-4 shadow-none">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sage-600" />
            <p className="text-sm text-ink-2">
              Profil und Gesundheitsdaten sind privat. Freigaben für Familie oder Physiotherapeut:innen folgen in einer späteren Version – immer nur mit deiner ausdrücklichen Zustimmung.
            </p>
          </Card>
          <Link to="/diary?new=1" className="mt-3 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-sage-600">
            <NotebookPen className="size-4" /> Moment mit {dog.name} festhalten
          </Link>
        </section>
      </div>

      <Sheet open={edit} onClose={() => setEdit(false)} title={`${dog.name} bearbeiten`}>
        <DogForm
          initial={dog}
          submitLabel="Änderungen speichern"
          onSubmit={async (d, photo) => {
            await save(d, photo)
            setEdit(false)
            toast('Profil gespeichert')
          }}
        />
        <button onClick={() => { setEdit(false); setConfirmDelete(true) }} className="mx-auto mt-4 flex items-center gap-2 py-2 text-sm font-semibold text-alert">
          <Trash className="size-4" /> Hundeprofil löschen
        </button>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`${dog.name} löschen?`}>
        <p className="text-ink-2">Das Profil wird mit Foto, Trainingsplänen, Verlauf und Tagebucheinträgen dauerhaft gelöscht.</p>
        {deleteError && <p role="alert" className="mt-4 rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{deleteError}</p>}
        <div className="mt-6 grid grid-cols-1 gap-2.5">
          <Button
            variant="danger"
            block
            onClick={async () => {
              try {
                await remove(dog.id)
                setConfirmDelete(false)
                toast('Profil gelöscht')
                navigate('/', { replace: true })
              } catch (e) {
                setDeleteError(e instanceof ApiError ? e.message : 'Löschen fehlgeschlagen.')
              }
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

function Fact({ icon: Icon, label, value }: { icon: typeof Cake; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-4">
      <Icon className="size-4 text-ink-3" />
      <span className="text-[15px] font-semibold">{value}</span>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{label}</span>
    </div>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-tile bg-sunken/70 px-3 py-4 text-center">
      <div className="font-display text-2xl font-medium tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-ink-3">{label}</div>
    </div>
  )
}

