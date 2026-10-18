import { Camera, Mars, Venus } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button, ChoiceGroup, DogPortrait, Select, TextArea, TextField } from '../../components/ui'
import { dogAccents } from '../../data/meta'
import type { Dog, DogAccent } from '../../data/types'
import { cn } from '../../lib/cn'
import { fileToDataUrl } from '../../lib/image'

export function emptyDog(id: string): Dog {
  return { id, name: '', breed: '', sex: 'female', birthDate: '', weightKg: 0, neutered: null, healthNotes: '', bio: '', photoUrl: null, accent: 'sage' }
}

interface Props {
  initial: Dog
  submitLabel: string
  onSubmit: (dog: Dog) => void
}

/** Formular für Anlegen und Bearbeiten – Validierung erfolgt später zusätzlich serverseitig. */
export function DogForm({ initial, submitLabel, onSubmit }: Props) {
  const [d, setD] = useState<Dog>(initial)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Dog>(k: K, v: Dog[K]) => setD((x) => ({ ...x, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!d.name.trim()) return setError('Wie heißt dein Hund?')
    if (!d.birthDate) return setError('Bitte ein Geburtsdatum angeben – ein ungefähres reicht.')
    if (d.birthDate > new Date().toISOString().slice(0, 10)) return setError('Das Geburtsdatum liegt in der Zukunft.')
    if (!(d.weightKg > 0 && d.weightKg < 120)) return setError('Bitte ein Gewicht zwischen 0 und 120 kg angeben.')
    setError(null)
    onSubmit({ ...d, name: d.name.trim(), breed: d.breed.trim() })
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => fileRef.current?.click()} className="group relative rounded-full" aria-label="Profilfoto wählen">
          <DogPortrait dog={{ ...d, name: d.name || '?' }} size={88} />
          <span className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full border-2 border-canvas bg-ink text-white transition group-active:scale-90">
            <Camera className="size-4" />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try {
              set('photoUrl', await fileToDataUrl(f))
            } catch (err) {
              setError((err as Error).message)
            }
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-2 text-sm font-semibold text-ink-2">Farbe ohne Foto</div>
          <div className="flex gap-2">
            {(Object.keys(dogAccents) as DogAccent[]).map((a) => (
              <button
                key={a}
                type="button"
                aria-label={`Farbe ${a}`}
                aria-pressed={d.accent === a}
                onClick={() => set('accent', a)}
                className={cn('size-9 rounded-full transition active:scale-90', d.accent === a && 'ring-2 ring-ink ring-offset-2 ring-offset-canvas')}
                style={{ background: `linear-gradient(140deg, ${dogAccents[a].from}, ${dogAccents[a].to})` }}
              />
            ))}
          </div>
          {d.photoUrl && (
            <button type="button" onClick={() => set('photoUrl', null)} className="mt-2 text-xs font-semibold text-ink-3 underline">
              Foto entfernen
            </button>
          )}
        </div>
      </div>

      <TextField label="Name" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="z. B. Lola" maxLength={40} autoComplete="off" />
      <TextField label="Rasse" value={d.breed} onChange={(e) => set('breed', e.target.value)} placeholder="z. B. Rauhaardackel" maxLength={60} />
      <ChoiceGroup
        label="Geschlecht"
        value={d.sex}
        onChange={(v) => set('sex', v)}
        options={[
          { value: 'female', label: 'Hündin', icon: <Venus className="size-4" /> },
          { value: 'male', label: 'Rüde', icon: <Mars className="size-4" /> },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Geburtsdatum" type="date" value={d.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
        <TextField label="Gewicht" hint="kg" type="number" inputMode="decimal" step="0.1" min="0" value={d.weightKg || ''} onChange={(e) => set('weightKg', Number(e.target.value))} />
      </div>
      <Select label="Kastriert" value={d.neutered === null ? '' : d.neutered ? 'yes' : 'no'} onChange={(e) => set('neutered', e.target.value === '' ? null : e.target.value === 'yes')}>
        <option value="">Keine Angabe</option>
        <option value="yes">Ja</option>
        <option value="no">Nein</option>
      </Select>
      <TextArea label="Über deinen Hund" hint="optional" value={d.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Was macht deinen Hund besonders?" maxLength={280} />
      <TextArea label="Gesundheitliche Hinweise" hint="nur für dich" value={d.healthNotes} onChange={(e) => set('healthNotes', e.target.value)} placeholder="z. B. Diagnosen, Unverträglichkeiten, Besonderheiten" maxLength={1000} />

      {error && <p role="alert" className="rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{error}</p>}
      <Button type="submit" size="lg" block>
        {submitLabel}
      </Button>
    </form>
  )
}
