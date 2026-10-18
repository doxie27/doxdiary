import { Check, ChevronDown, Info, Pause, Play, RotateCcw, SkipForward, Undo2, Volume2, VolumeX, X } from 'lucide-react'
import { chime, setSoundEnabled, soundEnabled, unlockSound } from '../../lib/sound'
import { useLiveActions } from '../../store/useLiveActions'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, DogPortrait, IconButton, ProgressRing, Sheet, useToast } from '../../components/ui'
import { feedbackMeta, supportIcon as SupportIcon } from '../../data/meta'
import type { ExerciseFeedback } from '../../data/types'
import { cn, uid } from '../../lib/cn'
import { clock, duration } from '../../lib/format'
import { useStore } from '../../store/AppStore'
import { ExerciseMedia } from './ExerciseMedia'
import { CategoryBadge, ParamLine } from './parts'
import { buildSteps, currentStep, initSession, sessionReducer, type SessionState } from './sessionMachine'

export function SessionPage() {
  const { planId } = useParams()
  const { state, dog } = useStore()
  const plan = state.plans.find((p) => p.id === planId && p.dogId === dog.id)
  const steps = useMemo(() => (plan ? buildSteps(plan, state.exercises) : []), [plan, state.exercises])
  if (!plan || steps.length === 0) return <Navigate to="/training" replace />
  return <SessionRunner planId={plan.id} planName={plan.name} steps={steps} />
}

function SessionRunner({ planId, planName, steps }: { planId: string; planName: string; steps: ReturnType<typeof buildSteps> }) {
  const { dog } = useStore()
  const { saveSession } = useLiveActions()
  const [sound, setSound] = useState(soundEnabled)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const [s, dispatch] = useReducer(sessionReducer, steps, initSession)
  const [leave, setLeave] = useState(false)
  const startedAt = useRef(new Date().toISOString())
  const step = currentStep(s)

  // Sekundentakt – Logik liegt vollständig im Reducer
  useEffect(() => {
    const t = setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => clearInterval(t)
  }, [])

  // Haptik + Signalton beim Phasenwechsel (Pause beginnt/endet, Übung geschafft)
  const lastPhase = useRef(s.phase)
  useEffect(() => {
    const prev = lastPhase.current
    if (prev !== s.phase && (s.phase === 'rest' || s.phase === 'feedback' || (prev === 'rest' && s.phase === 'work'))) {
      navigator.vibrate?.(120)
      chime()
    }
    lastPhase.current = s.phase
  }, [s.phase])

  // Bildschirm während des Trainings anlassen (Screen Wake Lock), soweit unterstützt
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null
      } catch {
        lock = null
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && request()
    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => null)
    }
  }, [])

  const save = async (note: string) => {
    if (saving) return
    setSaving(true)
    try {
      const { pending } = await saveSession({
        id: uid('session'),
        dogId: dog.id,
        planId,
        planName,
        startedAt: startedAt.current,
        finishedAt: new Date().toISOString(),
        activeSec: s.activeSec,
        results: s.results,
        note: note.trim(),
      })
      toast(pending ? 'Gespeichert – wird übertragen, sobald du online bist' : 'Einheit gespeichert')
      navigate('/training/history', { replace: true })
    } catch (e) {
      toast((e as Error).message)
      setSaving(false)
    }
  }

  const close = () => (s.phase === 'intro' ? navigate(-1) : setLeave(true))

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* Kopfzeile mit Fortschritt */}
      <header className="sticky top-0 z-20 bg-canvas/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <IconButton icon={X} label="Training verlassen" variant="ghost" onClick={close} />
          <span className="size-11" />
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-sm font-semibold">{planName}</div>
            {s.phase !== 'intro' && s.phase !== 'summary' && (
              <div className="text-xs font-medium tabular-nums text-ink-3">
                Übung {s.index + 1} von {steps.length} · {clock(s.activeSec)}
              </div>
            )}
          </div>
          <IconButton
            icon={sound ? Volume2 : VolumeX}
            label={sound ? 'Signalton aus' : 'Signalton an'}
            variant="ghost"
            onClick={() => {
              setSoundEnabled(!sound)
              setSound(!sound)
              unlockSound()
            }}
          />
          {s.phase !== 'intro' && s.phase !== 'summary' ? (
            <IconButton icon={Pause} label="Training pausieren" variant="ghost" onClick={() => dispatch({ type: 'pause' })} />
          ) : (
            <span className="size-11" />
          )}
        </div>
        {s.phase !== 'intro' && (
          <div className="mx-auto mt-3 flex max-w-xl gap-1.5 px-1" aria-hidden>
            {steps.map((st, i) => {
              const r = s.results.find((x) => x.itemId === st.itemId)
              return (
                <span key={st.itemId} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <span
                    className={cn('block h-full rounded-full transition-all duration-500', r?.status === 'skipped' ? 'bg-line-strong' : 'bg-sage-600')}
                    style={{ width: r ? '100%' : i === s.index && s.phase !== 'summary' ? `${Math.round(((s.set - 1) / st.sets) * 100) || 8}%` : '0%' }}
                  />
                </span>
              )
            })}
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {s.phase === 'intro' && <Intro steps={steps} dogName={dog.name} onStart={() => { unlockSound(); dispatch({ type: 'start' }) }} />}
        {s.phase === 'work' && step && <Work s={s} dispatch={dispatch} />}
        {s.phase === 'rest' && step && <Rest s={s} dispatch={dispatch} />}
        {s.phase === 'feedback' && step && <Feedback key={step.itemId} name={step.exercise.name} isLast={s.index === steps.length - 1} onSubmit={(feedback, note) => dispatch({ type: 'feedback', feedback, note })} onStop={() => dispatch({ type: 'finishEarly' })} />}
        {s.phase === 'summary' && <Summary s={s} dogName={dog.name} onSave={save} onDiscard={() => navigate('/training', { replace: true })} />}
      </main>

      {s.paused && (
        <div className="fixed inset-0 z-40 flex animate-fade flex-col items-center justify-center bg-canvas/95 px-8 text-center backdrop-blur-md">
          <DogPortrait dog={dog} size={88} />
          <h2 className="font-display mt-6 text-3xl">Pausiert</h2>
          <p className="mt-2 max-w-xs text-ink-3">Gönnt euch einen Moment. Die Zeit läuft erst weiter, wenn du fortsetzt.</p>
          <div className="mt-8 grid w-full max-w-xs grid-cols-1 gap-2.5">
            <Button size="lg" icon={Play} onClick={() => dispatch({ type: 'resume' })}>Fortsetzen</Button>
            <Button variant="ghost" onClick={() => dispatch({ type: 'finishEarly' })}>Einheit abschließen</Button>
          </div>
        </div>
      )}

      <Sheet open={leave} onClose={() => setLeave(false)} title="Training verlassen?">
        <p className="text-ink-2">Du kannst die Einheit jetzt abschließen und den bisherigen Stand speichern – oder sie verwerfen.</p>
        <div className="mt-6 grid grid-cols-1 gap-2.5">
          <Button block onClick={() => { setLeave(false); dispatch({ type: 'finishEarly' }) }}>Abschließen & speichern</Button>
          <Button variant="danger" block onClick={() => navigate('/training', { replace: true })}>Verwerfen</Button>
          <Button variant="ghost" block onClick={() => setLeave(false)}>Weiter trainieren</Button>
        </div>
      </Sheet>
    </div>
  )
}

type Dispatch = (e: Parameters<typeof sessionReducer>[1]) => void

function Intro({ steps, dogName, onStart }: { steps: ReturnType<typeof buildSteps>; dogName: string; onStart: () => void }) {
  const total = steps.reduce((sum, st) => sum + (st.durationSec ?? (st.reps ?? 6) * 5) * st.sets + (st.restSec ?? 0) * (st.sets - 1), 0)
  const equipment = [...new Set(steps.flatMap((st) => st.exercise.equipment))]
  return (
    <div className="flex flex-1 animate-rise flex-col">
      <div className="py-6">
        <p className="text-sm font-semibold text-ink-3">Bereit, {dogName}?</p>
        <h1 className="font-display mt-1 text-4xl font-medium">{steps.length} Übungen</h1>
        <p className="mt-1 text-ink-3">ca. {Math.max(1, Math.round(total / 60))} Minuten reine Übungszeit</p>
      </div>
      <ol className="stagger grid grid-cols-1 gap-2">
        {steps.map((st, i) => (
          <li key={st.itemId} className="flex items-center gap-4 rounded-2xl bg-surface px-4 py-3 shadow-card">
            <span className="font-display w-5 text-center text-lg text-ink-3">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{st.exercise.name}</div>
              <ParamLine {...st} className="text-xs" />
            </div>
          </li>
        ))}
      </ol>
      {equipment.length > 0 && (
        <div className="mt-6 rounded-2xl border border-line p-4">
          <div className="text-sm font-semibold">Leg dir bereit</div>
          <p className="mt-1 text-sm text-ink-3">{equipment.join(' · ')}</p>
        </div>
      )}
      <div className="mt-auto pt-8">
        <Button size="lg" block icon={Play} onClick={onStart}>Los geht’s</Button>
      </div>
    </div>
  )
}

function Work({ s, dispatch }: { s: SessionState; dispatch: Dispatch }) {
  const step = currentStep(s)!
  const ex = step.exercise
  const [showInfo, setShowInfo] = useState(false)
  const timed = !!step.durationSec
  return (
    <div key={`${step.itemId}-${s.set}`} className="flex flex-1 animate-rise flex-col">
      <div className="pt-4">
        <div className="flex items-center justify-between">
          <CategoryBadge category={ex.category} />
          {step.sets > 1 && <span className="text-sm font-semibold tabular-nums text-ink-3">Satz {s.set} von {step.sets}</span>}
        </div>
        <h1 className="font-display mt-3 text-[2rem] leading-tight font-medium">{ex.name}</h1>
        <button onClick={() => setShowInfo((v) => !v)} className="mt-2 flex items-center gap-1 text-sm font-semibold text-sage-600" aria-expanded={showInfo}>
          Anleitung {showInfo ? 'ausblenden' : 'anzeigen'} <ChevronDown className={cn('size-4 transition-transform', showInfo && 'rotate-180')} />
        </button>
        {showInfo && (
          <div className="mt-3 animate-fade space-y-3">
            <ExerciseMedia exercise={ex} className="aspect-[16/9]" />
            <p className="leading-relaxed text-ink-2">{ex.description}</p>
            {ex.notes && <p className="rounded-2xl bg-honey-100/60 px-4 py-3 text-sm text-ink-2">{ex.notes}</p>}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-8">
        {timed ? (
          <>
            <button onClick={() => dispatch({ type: 'toggleTimer' })} className="rounded-full transition active:scale-95" aria-label={s.timerRunning ? 'Timer anhalten' : 'Timer starten'}>
              <ProgressRing value={1 - s.timerLeft / step.durationSec!} size={232} stroke={10} label="Verbleibende Zeit">
                <div className="flex flex-col items-center">
                  <span className="font-display text-6xl font-medium tabular-nums">{clock(s.timerLeft)}</span>
                  <span className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-sage-600">
                    {s.timerRunning ? <><Pause className="size-4" /> Anhalten</> : <><Play className="size-4 fill-current" /> {s.timerLeft === step.durationSec ? 'Start' : 'Weiter'}</>}
                  </span>
                </div>
              </ProgressRing>
            </button>
            <button onClick={() => dispatch({ type: 'resetTimer' })} className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-ink-3">
              <RotateCcw className="size-4" /> Zurücksetzen
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { dispatch({ type: 'countRep' }); navigator.vibrate?.(15) }}
              className="relative flex size-58 flex-col items-center justify-center rounded-full bg-surface shadow-float transition active:scale-95"
              aria-label="Wiederholung zählen"
            >
              <ProgressRing value={step.reps ? s.reps / step.reps : 0} size={232} stroke={10}>
                <div className="flex flex-col items-center">
                  <span key={s.reps} className="font-display animate-pop text-7xl font-medium tabular-nums">{s.reps}</span>
                  <span className="text-sm font-semibold text-ink-3">{step.reps ? `von ${step.reps} Wdh.` : 'Wiederholungen'}</span>
                </div>
              </ProgressRing>
            </button>
            <div className="mt-4 flex items-center gap-4 text-sm font-semibold text-ink-3">
              <span>Tippen zum Zählen</span>
              {s.reps > 0 && (
                <button onClick={() => dispatch({ type: 'undoRep' })} className="flex items-center gap-1"><Undo2 className="size-4" /> Rückgängig</button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-2.5">
        <Button variant="secondary" size="lg" icon={SkipForward} className="px-4" onClick={() => dispatch({ type: 'skipExercise' })}>Überspringen</Button>
        {step.sets > 1 && s.set < step.sets ? (
          <Button size="lg" icon={Check} onClick={() => dispatch({ type: 'completeSet' })}>Satz fertig</Button>
        ) : (
          <Button size="lg" icon={Check} onClick={() => dispatch({ type: 'completeExercise' })}>Erledigt</Button>
        )}
      </div>
    </div>
  )
}

function Rest({ s, dispatch }: { s: SessionState; dispatch: Dispatch }) {
  const step = currentStep(s)!
  return (
    <div className="flex flex-1 animate-fade flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-honey-600">Kurze Pause</p>
      <div className="mt-6">
        <ProgressRing value={s.timerLeft / (step.restSec ?? 1)} size={220} stroke={8} track="var(--color-honey-100)" color="var(--color-honey-400)">
          <span className="font-display text-6xl font-medium tabular-nums">{clock(s.timerLeft)}</span>
        </ProgressRing>
      </div>
      <p className="mt-6 text-ink-2">
        Gleich folgt Satz {s.set + 1} von {step.sets}: <span className="font-semibold">{step.exercise.name}</span>
      </p>
      <p className="mt-1 text-sm text-ink-3">Lob nicht vergessen ✨</p>
      <div className="mt-auto grid w-full gap-2.5 pt-8">
        <Button size="lg" block onClick={() => dispatch({ type: 'skipRest' })}>Pause beenden</Button>
        <Button variant="ghost" block onClick={() => dispatch({ type: 'completeExercise' })}>Übung hier abschließen</Button>
      </div>
    </div>
  )
}

function Feedback({ name, isLast, onSubmit, onStop }: { name: string; isLast: boolean; onSubmit: (f: ExerciseFeedback | null, note: string) => void; onStop: () => void }) {
  const [fb, setFb] = useState<ExerciseFeedback | null>(null)
  const [note, setNote] = useState('')
  return (
    <div className="flex flex-1 animate-rise flex-col pt-6">
      <span className="flex size-14 animate-pop items-center justify-center rounded-full bg-sage-600 text-white">
        <Check className="size-7" strokeWidth={3} />
      </span>
      <h1 className="font-display mt-5 text-3xl leading-tight font-medium">Wie lief „{name}“?</h1>
      <p className="mt-1 text-ink-3">Deine Beobachtung hilft dir, den Verlauf nachzuvollziehen.</p>
      <div className="mt-6 grid grid-cols-1 gap-2.5">
        {(Object.keys(feedbackMeta) as ExerciseFeedback[]).map((k) => {
          const m = feedbackMeta[k]
          const on = fb === k
          return (
            <button key={k} aria-pressed={on} onClick={() => setFb(on ? null : k)} className={cn('flex items-center gap-4 rounded-2xl border-2 p-4 text-left font-semibold transition active:scale-[0.98]', on ? 'border-sage-600 bg-surface shadow-card' : 'border-transparent bg-surface')}>
              <span className={cn('flex size-11 items-center justify-center rounded-xl', m.tint)}><m.icon className="size-5" /></span>
              <span className="flex-1">{m.label}</span>
              <span className={cn('flex size-6 items-center justify-center rounded-full border-2 transition', on ? 'border-sage-600 bg-sage-600 text-white' : 'border-line-strong')}>
                {on && <Check className="size-3.5" strokeWidth={3.5} />}
              </span>
            </button>
          )
        })}
      </div>
      {fb === 'issue' && (
        <div role="note" className="mt-4 flex animate-rise gap-3 rounded-2xl bg-clay-100 p-4">
          <SupportIcon className="mt-0.5 size-5 shrink-0 text-alert" />
          <div className="text-sm leading-relaxed text-ink-2">
            <p className="font-semibold text-ink">Danke, dass du das festhältst.</p>
            <p className="mt-1">Doxie Diary gibt keine medizinischen Einschätzungen. Bitte sprich die Beobachtung mit deiner Tierärztin oder deinem Tierphysiotherapeuten ab, bevor du das Training fortsetzt oder anpasst.</p>
            {!isLast && <button onClick={() => { onSubmit(fb, note); onStop() }} className="mt-2 font-semibold text-alert underline underline-offset-2">Einheit hier beenden</button>}
          </div>
        </div>
      )}
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder={fb === 'issue' ? 'Was ist dir aufgefallen? (empfohlen)' : 'Kurze Notiz (optional)'} className="mt-4 w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 focus:border-sage-400 focus:outline-none focus:ring-4 focus:ring-sage-100" />
      <div className="mt-auto pt-6">
        <Button size="lg" block onClick={() => onSubmit(fb, note)}>{isLast ? 'Zur Zusammenfassung' : 'Nächste Übung'}</Button>
      </div>
    </div>
  )
}

function Summary({ s, dogName, onSave, onDiscard }: { s: SessionState; dogName: string; onSave: (note: string) => void; onDiscard: () => void }) {
  const [note, setNote] = useState('')
  const done = s.results.filter((r) => r.status === 'done').length
  const issues = s.results.filter((r) => r.feedback === 'issue')
  const counts = (Object.keys(feedbackMeta) as ExerciseFeedback[]).map((k) => ({ k, n: s.results.filter((r) => r.feedback === k).length })).filter((c) => c.n)
  return (
    <div className="flex flex-1 animate-rise flex-col items-center pt-8 text-center">
      <div className="relative">
        <ProgressRing value={done / s.steps.length} size={128} stroke={8}>
          <span className="flex size-20 animate-pop items-center justify-center rounded-full bg-sage-600 text-white"><Check className="size-10" strokeWidth={3} /></span>
        </ProgressRing>
      </div>
      <h1 className="font-display mt-6 text-4xl font-medium">{done > 0 ? `Geschafft, ${dogName}!` : 'Einheit beendet'}</h1>
      <p className="mt-2 text-ink-3">{done} von {s.steps.length} Übungen erledigt · {duration(s.activeSec || 1)} aktiv</p>

      {counts.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {counts.map(({ k, n }) => {
            const m = feedbackMeta[k]
            return <span key={k} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold', m.tint)}><m.icon className="size-4" /> {n}× {m.short}</span>
          })}
        </div>
      )}

      {issues.length > 0 && (
        <div className="mt-5 flex w-full gap-3 rounded-2xl bg-clay-100 p-4 text-left text-sm text-ink-2">
          <Info className="mt-0.5 size-5 shrink-0 text-alert" />
          <p>Du hast bei {issues.length === 1 ? 'einer Übung' : `${issues.length} Übungen`} Beschwerden notiert. Bitte besprich das mit einer Fachperson, bevor du das Training fortsetzt.</p>
        </div>
      )}

      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder={`Wie war ${dogName} heute drauf? (optional)`} className="mt-6 w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-left focus:border-sage-400 focus:outline-none focus:ring-4 focus:ring-sage-100" />
      <div className="mt-auto grid w-full gap-2.5 pt-8">
        <Button size="lg" block icon={Check} onClick={() => onSave(note)}>Einheit speichern</Button>
        <Button variant="ghost" block onClick={onDiscard}>Nicht speichern</Button>
      </div>
    </div>
  )
}
