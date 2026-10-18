import { Check, ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Select, Stepper, TextArea, TextField, useToast } from '../../components/ui'
import type { Exercise, ExerciseCategory } from '../../data/types'
import { uid } from '../../lib/cn'
import { dataUrlToBlob, fileToDataUrl } from '../../lib/image'
import { ApiError } from '../../api/client'
import { useLiveActions } from '../../store/useLiveActions'
import type { PhotoChange } from '../../store/useDogActions'
import { useStore } from '../../store/AppStore'
import { categoryOptions } from './ExerciseDetailPage'
import { ExerciseMedia } from './ExerciseMedia'

export function ExerciseEditorPage() {
  const { id } = useParams()
  const { state } = useStore()
  const { saveExercise } = useLiveActions()
  const [photo, setPhoto] = useState<PhotoChange>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const existing = state.exercises.find((e) => e.id === id)
  const [ex, setEx] = useState<Exercise>(
    () =>
      existing ?? {
        id: uid('ex'),
        name: '',
        description: '',
        category: 'kraft',
        reps: 8,
        sets: 2,
        durationSec: null,
        restSec: 30,
        equipment: [],
        notes: '',
        mediaUrl: null,
        source: { kind: 'owner', name: state.user.firstName },
      },
  )
  const [equip, setEquip] = useState('')
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof Exercise>(k: K, v: Exercise[K]) => setEx((x) => ({ ...x, [k]: v }))

  const addEquip = () => {
    const v = equip.trim()
    if (v && !ex.equipment.includes(v)) set('equipment', [...ex.equipment, v])
    setEquip('')
  }

  const save = () => {
    if (!ex.name.trim()) return setError('Gib der Übung einen Namen.')
    if (!ex.reps && !ex.durationSec) return setError('Lege Wiederholungen oder eine Dauer fest.')
    setBusy(true)
    saveExercise({ ...ex, name: ex.name.trim() }, photo)
      .then((saved) => {
        toast(existing ? 'Übung gespeichert' : 'Übung angelegt')
        navigate(`/training/exercises/${saved.id}`, { replace: true })
      })
      .catch((e) => setError(e instanceof ApiError ? (Object.values(e.fields)[0] ?? e.message) : 'Speichern fehlgeschlagen.'))
      .finally(() => setBusy(false))
  }

  return (
    <div className="pb-44 lg:pb-10">
      <PageHeader title={existing ? 'Übung bearbeiten' : 'Neue Übung'} eyebrow="Übungsbibliothek" back />
      <div className="space-y-5 px-5 lg:px-8">
        <div className="relative">
          <ExerciseMedia exercise={ex} className="aspect-[16/9]" />
          <div className="absolute bottom-3 right-3 flex gap-2">
            {ex.mediaUrl && (
              <button onClick={() => { set('mediaUrl', null); setPhoto('remove') }} className="flex h-10 items-center gap-1.5 rounded-full bg-white/80 px-3.5 text-sm font-semibold backdrop-blur-md">
                <X className="size-4" /> Entfernen
              </button>
            )}
            <button onClick={() => fileRef.current?.click()} className="flex h-10 items-center gap-1.5 rounded-full bg-white/80 px-3.5 text-sm font-semibold backdrop-blur-md active:scale-95">
              <ImagePlus className="size-4" /> {ex.mediaUrl ? 'Ändern' : 'Foto hinzufügen'}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const url = await fileToDataUrl(f, 1600).catch(() => null)
              if (!url) return setError('Das Bild konnte nicht gelesen werden.')
              set('mediaUrl', url)
              setPhoto({ file: await dataUrlToBlob(url) })
            }}
          />
        </div>
        
        <TextField label="Name" value={ex.name} onChange={(e) => set('name', e.target.value)} placeholder="z. B. Sitz-Steh-Wechsel" maxLength={80} />
        <Select label="Kategorie" value={ex.category} onChange={(e) => set('category', e.target.value as ExerciseCategory)}>
          {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <TextArea label="Beschreibung" value={ex.description} onChange={(e) => set('description', e.target.value)} rows={4} placeholder="Wie wird die Übung ausgeführt? Worauf achten?" maxLength={1000} />

        <fieldset className="grid grid-cols-1 gap-2">
          <legend className="mb-1.5 px-1 text-sm font-semibold text-ink-2">Standardwerte</legend>
          <Stepper label="Sätze" value={ex.sets} min={1} max={10} onChange={(v) => set('sets', v)} />
          <Stepper label="Wiederholungen" value={ex.reps} max={50} onChange={(v) => set('reps', v)} />
          <Stepper label="Dauer" unit="s" step={5} max={1800} value={ex.durationSec} onChange={(v) => set('durationSec', v)} />
          <Stepper label="Pause" unit="s" step={5} max={600} value={ex.restSec} onChange={(v) => set('restSec', v)} />
          <p className="px-1 text-xs text-ink-3">Mit Dauer startet im Training ein Timer, sonst ein Wiederholungszähler. In jedem Plan individuell anpassbar.</p>
        </fieldset>

        <div>
          <div className="flex gap-2">
            <TextField className="flex-1" label="Hilfsmittel" value={equip} onChange={(e) => setEquip(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEquip())} placeholder="z. B. Balancekissen" />
            <Button variant="secondary" className="mt-[26px]" onClick={addEquip}>Hinzufügen</Button>
          </div>
          {ex.equipment.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {ex.equipment.map((e) => (
                <button key={e} onClick={() => set('equipment', ex.equipment.filter((x) => x !== e))} className="inline-flex items-center gap-1 rounded-full bg-sunken px-3 py-1.5 text-sm font-medium" aria-label={`${e} entfernen`}>
                  {e} <X className="size-3.5 text-ink-3" />
                </button>
              ))}
            </div>
          )}
        </div>
        <TextArea label="Zusätzliche Hinweise" hint="optional" value={ex.notes} onChange={(e) => set('notes', e.target.value)} placeholder="z. B. Hinweise deiner Physiotherapeutin" maxLength={600} />
        {error && <p role="alert" className="rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{error}</p>}
      </div>
      <div className="fixed inset-x-0 bottom-[84px] z-30 bg-gradient-to-t from-canvas via-canvas/95 to-transparent px-5 pb-3 pt-6 lg:static lg:mt-8 lg:bg-none lg:p-0 lg:px-8">
        <Button size="lg" block icon={Check} className="shadow-float" onClick={save} disabled={busy}>{existing ? 'Änderungen speichern' : 'Übung anlegen'}</Button>
      </div>
    </div>
  )
}
