import { ImagePlus, NotebookPen, Plus, Trash, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, ChoiceGroup, EmptyState, Sheet, TextArea, TextField, useToast } from '../../components/ui'
import { diaryCategories } from '../../data/meta'
import type { DiaryCategory, DiaryEntry } from '../../data/types'
import { dayKey } from '../../lib/date'
import { cn, uid } from '../../lib/cn'
import { fmt, relativeDay } from '../../lib/format'
import { dataUrlToBlob, fileToDataUrl } from '../../lib/image'
import { useLiveActions } from '../../store/useLiveActions'
import { useStore } from '../../store/AppStore'

export function DiaryPage() {
  const { state, dog } = useStore()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<DiaryCategory | null>(null)
  const [editing, setEditing] = useState<DiaryEntry | null>(null)

  useEffect(() => {
    if (params.get('new')) {
      setEditing(newEntry(dog.id))
      setParams({}, { replace: true })
    }
  }, [params, setParams, dog.id])

  const groups = useMemo(() => {
    const list = state.diary.filter((e) => e.dogId === dog.id && (!filter || e.category === filter)).sort((a, b) => b.at.localeCompare(a.at))
    const m = new Map<string, DiaryEntry[]>()
    for (const e of list) m.set(dayKey(e.at), [...(m.get(dayKey(e.at)) ?? []), e])
    return [...m.entries()]
  }, [state.diary, dog.id, filter])

  return (
    <div>
      <PageHeader title="Tagebuch" eyebrow={`Momente mit ${dog.name}`} actions={<Button size="sm" variant="soft" icon={Plus} onClick={() => setEditing(newEntry(dog.id))}>Eintrag</Button>} />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-5 lg:px-8">
        <Filter active={!filter} onClick={() => setFilter(null)}>Alle</Filter>
        {(Object.keys(diaryCategories) as DiaryCategory[]).map((c) => {
          const m = diaryCategories[c]
          return <Filter key={c} active={filter === c} onClick={() => setFilter(filter === c ? null : c)}><m.icon className="size-4" />{m.label}</Filter>
        })}
      </div>

      <div className="px-5 pb-6 lg:px-8">
        {groups.length === 0 ? (
          <EmptyState icon={<NotebookPen className="size-6" />} title="Noch keine Einträge" text={`Halte Alltag, Gesundheit und besondere Momente mit ${dog.name} fest.`} action={<Button icon={Plus} onClick={() => setEditing(newEntry(dog.id))}>Ersten Eintrag schreiben</Button>} />
        ) : (
          <div className="stagger space-y-6">
            {groups.map(([day, entries]) => (
              <section key={day} className="relative pl-6">
                <span className="absolute bottom-0 left-[7px] top-7 w-px bg-line-strong/70" aria-hidden />
                <span className="absolute left-0 top-1.5 size-[15px] rounded-full border-[3px] border-canvas bg-sage-400 ring-1 ring-sage-300" aria-hidden />
                <h2 className="mb-3 text-sm font-semibold text-ink-2">
                  {relativeDay(entries[0].at)} <span className="font-medium text-ink-3">· {fmt.dateLong(entries[0].at)}</span>
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {entries.map((e) => {
                    const m = diaryCategories[e.category]
                    return (
                      <button key={e.id} onClick={() => setEditing(e)} className="text-left">
                        <Card className="p-4 transition hover:border-line-strong active:scale-[0.99]">
                          <div className="flex items-center gap-2">
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', m.tint)}><m.icon className="size-3.5" />{m.label}</span>
                            <span className="text-xs font-medium text-ink-3">{fmt.time(e.at)} Uhr</span>
                          </div>
                          <h3 className="font-display mt-2.5 text-xl leading-snug">{e.title}</h3>
                          {e.text && <p className="mt-1 line-clamp-3 leading-relaxed text-ink-2">{e.text}</p>}
                          {e.photos.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-1.5">
                              {e.photos.slice(0, 3).map((p, i) => <img key={i} src={p} alt="" className="aspect-square w-full rounded-xl object-cover" />)}
                            </div>
                          )}
                        </Card>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      {editing && <EntrySheet entry={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function newEntry(dogId: string): DiaryEntry {
  return { id: uid('entry'), dogId, at: new Date().toISOString(), category: 'alltag', title: '', text: '', photos: [] }
}

function toLocalInput(iso: string) {
  const d = new Date(iso)
  return `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function EntrySheet({ entry, onClose }: { entry: DiaryEntry; onClose: () => void }) {
  const { state } = useStore()
  const { saveEntry, removeEntry } = useLiveActions()
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const isNew = !state.diary.some((e) => e.id === entry.id)
  const [e, setE] = useState(entry)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof DiaryEntry>(k: K, v: DiaryEntry[K]) => setE((x) => ({ ...x, [k]: v }))

  const attempt = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError((err as Error).message || 'Speichern fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  const save = () => {
    if (!e.title.trim() && !e.text.trim()) return setError('Schreib einen Titel oder ein paar Worte.')
    attempt(async () => {
      // Neue Fotos liegen als Data-URL vor, entfernte sind im Original, aber nicht mehr im Entwurf
      const added = await Promise.all(e.photos.filter((p) => p.startsWith('data:') && !entry.photos.includes(p)).map(dataUrlToBlob))
      const removed = entry.photos.filter((p) => !e.photos.includes(p))
      await saveEntry({ ...e, title: e.title.trim() || diaryCategories[e.category].label }, added, removed)
      toast(isNew ? 'Eintrag gespeichert' : 'Änderungen gespeichert')
      onClose()
    })
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={isNew ? 'Neuer Eintrag' : 'Eintrag'}
      footer={
        <div className="flex gap-2.5">
          {!isNew && <Button variant="danger" icon={Trash} aria-label="Eintrag löschen" disabled={busy} onClick={() => attempt(async () => { await removeEntry(e.id); toast('Eintrag gelöscht'); onClose() })} />}
          <Button block onClick={save} disabled={busy}>{busy ? 'Wird gespeichert …' : 'Speichern'}</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <ChoiceGroup
          label="Kategorie"
          value={e.category}
          onChange={(v) => set('category', v)}
          options={(Object.keys(diaryCategories) as DiaryCategory[]).map((c) => {
            const m = diaryCategories[c]
            return { value: c, label: m.label, icon: <m.icon className="size-4" /> }
          })}
        />
        <TextField label="Titel" value={e.title} onChange={(x) => set('title', x.target.value)} placeholder="Was ist passiert?" maxLength={80} />
        <TextArea label="Notiz" value={e.text} onChange={(x) => set('text', x.target.value)} rows={4} maxLength={2000} placeholder="Erzähl ein bisschen …" />
        <TextField label="Datum & Uhrzeit" type="datetime-local" value={toLocalInput(e.at)} onChange={(x) => x.target.value && set('at', new Date(x.target.value).toISOString())} />
        <div>
          <div className="mb-1.5 px-1 text-sm font-semibold text-ink-2">Fotos</div>
          <div className="grid grid-cols-4 gap-2">
            {e.photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p} alt="" className="aspect-square w-full rounded-xl object-cover" />
                <button onClick={() => set('photos', e.photos.filter((_, j) => j !== i))} aria-label="Foto entfernen" className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-white"><X className="size-3.5" /></button>
              </div>
            ))}
            {e.photos.length < 4 && (
              <button onClick={() => fileRef.current?.click()} className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-line-strong text-ink-3 transition hover:border-sage-400 hover:text-sage-600" aria-label="Foto hinzufügen">
                <ImagePlus className="size-6" />
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (x) => {
            const f = x.target.files?.[0]
            x.target.value = ''
            if (f) set('photos', [...e.photos, await fileToDataUrl(f, 1600)])
          }} />
        </div>
        {error && <p role="alert" className="rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{error}</p>}
      </div>
    </Sheet>
  )
}

function Filter({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={cn('inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition active:scale-95', active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2')}>
      {children}
    </button>
  )
}
