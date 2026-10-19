import { CalendarRange, ChevronLeft, ChevronRight, FileDown, Info, Lock, Star, Stethoscope } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, DogBackdrop, DogPortrait, IconButton, SectionHeader, Segmented, TextField, useToast } from '../../components/ui'
import { diaryCategories, feedbackMeta } from '../../data/meta'
import type { DiaryCategory } from '../../data/types'
import { ageFrom, dayKey } from '../../lib/date'
import { cn } from '../../lib/cn'
import { fmt } from '../../lib/format'
import { useStore } from '../../store/AppStore'
import { customPeriod, periodFor, periodTitle, type Period, type PeriodKind } from './period'
import { buildReview, buildVetReport } from './summary'

type Mode = 'review' | 'vet'

/**
 * Rückblick (Woche/Monat/Jahr/frei) und sachlicher Bericht für Tierarzt/Physio –
 * jeweils mit Vorschau in der App und PDF-Erzeugung auf dem Gerät.
 */
export function ReviewPage() {
  const { state, dog } = useStore()
  const toast = useToast()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'vet' ? 'vet' : 'review')
  const [kind, setKind] = useState<PeriodKind>(params.get('mode') === 'vet' ? 'custom' : 'month')
  const [offset, setOffset] = useState(0)
  const today = dayKey(new Date())
  const [from, setFrom] = useState(dayKey(new Date(Date.now() - 89 * 86_400_000)))
  const [to, setTo] = useState(today)
  const [cats, setCats] = useState<DiaryCategory[] | null>(null)
  const [withPhotos, setWithPhotos] = useState(true)
  const [busy, setBusy] = useState(false)

  const period: Period = useMemo(() => (kind === 'custom' ? customPeriod(from <= to ? from : to, to >= from ? to : from) : periodFor(kind, new Date(), offset)), [kind, offset, from, to])
  const review = useMemo(() => buildReview(dog, state.diary, state.sessions, period, cats), [dog, state.diary, state.sessions, period, cats])
  const vet = useMemo(() => buildVetReport(dog, state.diary, state.sessions, state.plans, state.exercises, period), [dog, state.diary, state.sessions, state.plans, state.exercises, period])
  const title = periodTitle(dog.name, period)
  const empty = mode === 'review' ? review.stats.entries + review.stats.sessions === 0 : vet.healthEntries.length + vet.review.stats.sessions === 0 && !dog.healthNotes

  const createPdf = async () => {
    setBusy(true)
    try {
      const pdf = await import('./pdf')
      const blob =
        mode === 'review'
          ? await pdf.createReviewPdf({ dog, period, title, data: review, withPhotos })
          : await pdf.createVetPdf({ dog, period, owner: [state.user.firstName, state.user.lastName].filter(Boolean).join(' '), data: vet })
      const d = (x: Date) => x.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const last = new Date(period.to.getTime() - 86_400_000)
      const label = period.kind === 'week' || period.kind === 'custom' ? `${d(period.from)} bis ${d(last)}` : period.label
      const name = mode === 'review' ? `Doxie Diary - ${title}${period.kind === 'month' ? ` ${period.from.getFullYear()}` : ''}${period.kind === 'week' || period.kind === 'custom' ? ` ${label}` : ''}.pdf` : `Doxie Diary - Bericht ${dog.name} ${label}.pdf`
      // Nur unkritische Zeichen – Chrome verwirft Dateinamen z. B. mit Gedankenstrich
      await pdf.deliver(blob, name.replace(/[^\p{L}\p{N} ._()-]/gu, '').replace(/\s+/g, ' '))
      toast('PDF erstellt')
    } catch (e) {
      toast((e as Error).message || 'PDF konnte nicht erstellt werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pb-44 lg:pb-10">
      <PageHeader title={mode === 'review' ? 'Rückblick' : 'Bericht für Tierarzt/Physio'} eyebrow={`Mit ${dog.name}`} back />
      <div className="space-y-5 px-5 lg:px-8">
        <Segmented value={mode} onChange={(m) => { setMode(m); if (m === 'vet' && kind !== 'custom') setKind('custom') }} options={[{ value: 'review', label: 'Rückblick' }, { value: 'vet', label: 'Tierarzt/Physio' }]} />

        <Card className="space-y-4 p-4">
          <Segmented value={kind} onChange={(k) => { setKind(k); setOffset(0) }} options={[{ value: 'week', label: 'Woche' }, { value: 'month', label: 'Monat' }, { value: 'year', label: 'Jahr' }, { value: 'custom', label: 'Frei' }]} />
          {kind === 'custom' ? (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Von" type="date" value={from} max={today} onChange={(e) => e.target.value && setFrom(e.target.value)} />
              <TextField label="Bis" type="date" value={to} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <IconButton icon={ChevronLeft} label="Vorheriger Zeitraum" variant="ghost" onClick={() => setOffset((o) => o - 1)} />
              <div className="text-center">
                <div className="font-semibold">{period.label}</div>
                <div className="text-xs text-ink-3">{period.range}</div>
              </div>
              <IconButton icon={ChevronRight} label="Nächster Zeitraum" variant="ghost" disabled={offset >= 0} className="disabled:opacity-30" onClick={() => setOffset((o) => o + 1)} />
            </div>
          )}
          {mode === 'review' && (
            <>
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                <Pill active={!cats} onClick={() => setCats(null)}>Alle</Pill>
                {(Object.keys(diaryCategories) as DiaryCategory[]).map((c) => {
                  const m = diaryCategories[c]
                  const on = !!cats?.includes(c)
                  return (
                    <Pill key={c} active={on} onClick={() => setCats(on ? (cats!.length === 1 ? null : cats!.filter((x) => x !== c)) : [...(cats ?? []), c])}>
                      <m.icon className="size-4" />{m.label}
                    </Pill>
                  )
                })}
              </div>
              <label className="flex items-center justify-between gap-3 px-1 text-sm font-semibold text-ink-2">
                Fotos ins PDF übernehmen
                <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} className="size-5 accent-[var(--color-sage-600)]" />
              </label>
            </>
          )}
        </Card>

        {empty ? (
          <Card className="flex flex-col items-center px-6 py-10 text-center">
            <CalendarRange className="size-8 text-ink-3" />
            <h2 className="font-display mt-3 text-xl">Für {period.label} gibt es noch nichts</h2>
            <p className="mt-1 max-w-xs text-sm text-ink-3">Wähle einen anderen Zeitraum oder halte erst ein paar Momente im Tagebuch fest.</p>
          </Card>
        ) : mode === 'review' ? (
          <ReviewPreview title={title} period={period} data={review} />
        ) : (
          <VetPreview period={period} data={vet} />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[84px] z-30 bg-gradient-to-t from-canvas via-canvas/95 to-transparent px-5 pb-3 pt-6 lg:static lg:mt-8 lg:bg-none lg:p-0 lg:px-8">
        <Button size="lg" block icon={FileDown} className="shadow-float" disabled={busy || empty} onClick={createPdf}>
          {busy ? 'PDF wird erstellt …' : 'PDF erstellen'}
        </Button>
      </div>
    </div>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition active:scale-95', active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2')}>
      {children}
    </button>
  )
}

function Bars({ buckets }: { buckets: Array<{ label: string; sessions: number }> }) {
  const max = Math.max(1, ...buckets.map((b) => b.sessions))
  return (
    <div className="flex h-28 items-end gap-1.5">
      {buckets.map((b, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${b.label}: ${b.sessions} Einheiten`}>
          <span className="text-[10px] font-semibold tabular-nums text-ink-3">{b.sessions || ''}</span>
          <span className="w-full max-w-6 rounded-t-[4px] bg-sage-400" style={{ height: `${Math.max(b.sessions ? 4 : 0, (b.sessions / max) * 100)}%` }} />
          <span className="text-[10px] font-medium text-ink-3">{b.label}</span>
        </div>
      ))}
    </div>
  )
}

function ReviewPreview({ title, period, data }: { title: string; period: Period; data: ReturnType<typeof buildReview> }) {
  const { dog } = useStore()
  const cover = data.highlights.find((e) => e.photos[0])?.photos[0] ?? data.photos[0] ?? dog.photoUrl
  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[2rem] shadow-card">
        <DogBackdrop dog={{ ...dog, photoUrl: cover }} className="-z-10" />
        <div className={cn('flex min-h-52 flex-col justify-end p-6', cover ? 'text-white' : 'text-ink')}>
          <p className="text-sm font-semibold opacity-80">{period.range}</p>
          <h2 className="font-display mt-1 text-4xl font-medium leading-tight">{title}</h2>
        </div>
        <div className="grid grid-cols-4 gap-px border-t border-white/40 bg-white/30 backdrop-blur-md">
          {[
            [data.stats.entries, 'Einträge'],
            [data.stats.photos, 'Fotos'],
            [data.stats.sessions, 'Trainings'],
            [data.stats.activeMinutes, 'Min. aktiv'],
          ].map(([v, l]) => (
            <div key={l} className="bg-white/45 px-2 py-3 text-center text-ink">
              <div className="text-lg font-semibold tabular-nums">{v}</div>
              <div className="text-[11px] font-semibold opacity-60">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {data.highlights.length > 0 && (
        <section>
          <SectionHeader title="Highlights" />
          <div className="grid grid-cols-1 gap-3">
            {data.highlights.map((e) => (
              <Card key={e.id} className="overflow-hidden">
                {e.photos[0] && <img src={e.photos[0]} alt="" className="aspect-[16/9] w-full object-cover" />}
                <div className="p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-honey-600"><Star className="size-3.5 fill-current" /> {fmt.dateLong(e.at)}</div>
                  <h3 className="font-display mt-1 text-xl">{e.title}</h3>
                  {e.text && <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-2">{e.text}</p>}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {data.photos.length > 0 && (
        <section>
          <SectionHeader title={`Fotos (${data.photos.length})`} />
          <div className="grid grid-cols-3 gap-1.5">
            {data.photos.slice(0, 9).map((p, i) => (
              <div key={i} className="relative">
                <img src={p} alt="" className="aspect-square w-full rounded-xl object-cover" />
                {i === 8 && data.photos.length > 9 && <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-ink/50 text-lg font-semibold text-white">+{data.photos.length - 9}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.stats.sessions > 0 && (
        <section>
          <SectionHeader title="Trainingsaktivität" />
          <Card className="p-5">
            <p className="mb-4 text-sm text-ink-2">
              {data.stats.sessions} Einheiten an {data.stats.trainingDays} Tagen · {data.stats.activeMinutes} Minuten aktiv
            </p>
            <Bars buckets={data.buckets} />
          </Card>
        </section>
      )}

      {data.groups.length > 0 && (
        <section>
          <SectionHeader title="Tagebuch" />
          <div className="space-y-5">
            {data.groups.map((g) => (
              <div key={g.key}>
                <h3 className="mb-2 px-1 text-sm font-semibold text-ink-2">{g.label}</h3>
                <div className="grid grid-cols-1 gap-2">
                  {g.entries.map((e) => {
                    const m = diaryCategories[e.category]
                    return (
                      <Card key={e.id} className="p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5', m.tint)}><m.icon className="size-3" />{m.label}</span>
                          <span className="text-ink-3">{fmt.dateShort(e.at)} · {fmt.time(e.at)}</span>
                          {e.highlight && <Star className="size-3.5 fill-honey-400 text-honey-400" />}
                        </div>
                        <div className="mt-1.5 font-semibold">{e.title}</div>
                        {e.text && <p className="line-clamp-2 text-sm text-ink-3">{e.text}</p>}
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function VetPreview({ period, data }: { period: Period; data: ReturnType<typeof buildVetReport> }) {
  const { dog } = useStore()
  const age = ageFrom(dog.birthDate)
  const fb = data.review.feedback
  return (
    <div className="space-y-6">
      <Card className="flex items-start gap-3 bg-sunken/60 p-4 shadow-none">
        <Stethoscope className="mt-0.5 size-5 shrink-0 text-sky-600" />
        <p className="text-sm text-ink-2">Sachlicher Bericht zum Mitnehmen: Stammdaten, Trainingsplan, Trainingshäufigkeit, deine Beobachtungen und Gesundheitseinträge – ohne Alltagseinträge und Fotos.</p>
      </Card>

      <section>
        <SectionHeader title="Patient" />
        <Card className="flex items-center gap-4 p-4">
          <DogPortrait dog={dog} size={56} />
          <div className="min-w-0 text-sm">
            <div className="font-display text-xl">{dog.name}</div>
            <div className="text-ink-3">
              {dog.breed || 'Rasse unbekannt'} · {dog.sex === 'female' ? 'Hündin' : 'Rüde'}{dog.neutered ? ', kastriert' : ''} · {age.years} J. {age.months} M. · {fmt.num(dog.weightKg)} kg
            </div>
          </div>
        </Card>
        {dog.healthNotes && <p className="mt-2 rounded-2xl bg-surface px-4 py-3 text-sm text-ink-2"><span className="font-semibold">Hinweise: </span>{dog.healthNotes}</p>}
      </section>

      <section>
        <SectionHeader title={`Training · ${period.range}`} />
        <div className="grid grid-cols-3 gap-3">
          <Mini value={data.review.stats.sessions} label="Einheiten" />
          <Mini value={data.review.stats.trainingDays} label="Trainingstage" />
          <Mini value={data.adherence.planned ? `${Math.round((data.adherence.done / data.adherence.planned) * 100)} %` : '–'} label="vom Plan" />
        </div>
        <Card className="mt-3 flex flex-wrap gap-2 p-4">
          {(['good', 'hard', 'issue'] as const).map((k) => (
            <span key={k} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold', feedbackMeta[k].tint)}>{fb[k]}× {feedbackMeta[k].short}</span>
          ))}
          <span className="inline-flex items-center rounded-full bg-sunken px-3 py-1 text-sm font-semibold text-ink-3">{fb.skipped}× übersprungen</span>
        </Card>
      </section>

      {data.plans.length > 0 && (
        <section>
          <SectionHeader title="Aktuelle Trainingspläne" />
          <div className="grid grid-cols-1 gap-2">
            {data.plans.map(({ plan, exercises }) => (
              <Card key={plan.id} className="p-4 text-sm">
                <div className="font-semibold">{plan.name}</div>
                <ul className="mt-1.5 space-y-0.5 text-ink-2">
                  {exercises.map((e, i) => <li key={i}>{i + 1}. {e.name}{e.params && <span className="text-ink-3"> · {e.params}</span>}</li>)}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      )}

      {data.hardByExercise.length > 0 && (
        <section>
          <SectionHeader title="Als „schwierig“ markiert" />
          <Card className="divide-y divide-line text-sm">
            {data.hardByExercise.map((h) => (
              <div key={h.exercise} className="flex items-center justify-between px-4 py-2.5">
                <span>{h.exercise}</span>
                <span className="font-semibold tabular-nums text-warn">{h.count}×</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <SectionHeader title={`Beschwerden & Notizen (${data.observations.length})`} />
        {data.observations.length === 0 ? (
          <p className="px-1 text-sm text-ink-3">Keine Beschwerden und keine Notizen im Zeitraum.</p>
        ) : (
          <Card className="divide-y divide-line text-sm">
            {data.observations.map((o, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{o.exercise}</span>
                  {o.feedback && <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', feedbackMeta[o.feedback].tint)}>{feedbackMeta[o.feedback].short}</span>}
                </div>
                <div className="text-xs text-ink-3">{fmt.dateShort(o.at)} · {o.planName}</div>
                {o.note && <p className="mt-1 text-ink-2">„{o.note}“</p>}
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <SectionHeader title={`Gesundheitseinträge (${data.healthEntries.length})`} />
        {data.healthEntries.length === 0 ? (
          <p className="px-1 text-sm text-ink-3">Keine Einträge in der Kategorie Gesundheit.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {data.healthEntries.map((e) => (
              <Card key={e.id} className="p-4 text-sm">
                <div className="text-xs font-semibold text-ink-3">{fmt.dateFull(e.at)}</div>
                <div className="mt-0.5 font-semibold">{e.title}</div>
                {e.text && <p className="mt-1 whitespace-pre-line text-ink-2">{e.text}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-3">
        <Info className="mt-0.5 size-3.5 shrink-0" /> Selbst dokumentierte Angaben aus Doxie Diary. Keine medizinische Bewertung. <Lock className="ml-1 mt-0.5 size-3.5 shrink-0" /> Das PDF entsteht auf deinem Gerät.
      </p>
    </div>
  )
}

function Mini({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-tile bg-sunken/70 px-3 py-3.5 text-center">
      <div className="font-display text-2xl font-medium tabular-nums">{value}</div>
      <div className="text-[11px] font-semibold text-ink-3">{label}</div>
    </div>
  )
}
