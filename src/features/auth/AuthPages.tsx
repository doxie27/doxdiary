import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../../components/layout/AppShell'
import { Button, TextField } from '../../components/ui'
import { useStore } from '../../store/AppStore'

/**
 * Anmelde-Oberflächen als Prototyp: Formulare validieren clientseitig,
 * führen aber keine echte Anmeldung durch (Phase 2: PHP-Session + CSRF).
 */

export function WelcomePage() {
  const { dispatch } = useStore()
  const navigate = useNavigate()
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-honey-100 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 top-1/3 size-96 rounded-full bg-sage-100 blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
        <Brand />
        <div className="stagger my-auto py-12">
          <div className="relative mb-10 h-60">
            <Bubble className="left-0 top-0 w-52 -rotate-3" title="Lolas Physiotraining" sub="5 Übungen · 12 Min." tone="bg-sage-600 text-white" />
            <Bubble className="right-0 top-[84px] w-40 rotate-2" title="7 Tage in Folge" sub="Schön dranbleiben" tone="bg-surface" />
            <Bubble className="left-3 top-[168px] w-56 rotate-1" title="Erster Ausflug an den See" sub="Tagebuch · Erlebnis" tone="bg-honey-100" />
          </div>
          <h1 className="font-display text-[2.6rem] leading-[1.05] font-medium">
            Dein Hund.<br />Dein Alltag.<br /><span className="text-sage-600 italic">Ein Ort für alles.</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">Physiotraining, Gesundheit und gemeinsame Momente – liebevoll festgehalten.</p>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          <Button size="lg" block iconRight={ArrowRight} onClick={() => navigate('/register')}>Kostenlos starten</Button>
          <Button size="lg" variant="secondary" block onClick={() => navigate('/login')}>Ich habe schon ein Konto</Button>
          <button onClick={() => { dispatch({ type: 'login' }); navigate('/') }} className="mt-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-sage-600">
            <Sparkles className="size-4" /> Prototyp mit Beispieldaten ansehen
          </button>
        </div>
      </div>
    </div>
  )
}

function Bubble({ className, title, sub, tone }: { className: string; title: string; sub: string; tone: string }) {
  return (
    <div className={`absolute rounded-3xl p-4 shadow-float ${tone} ${className}`}>
      <div className="font-semibold leading-snug">{title}</div>
      <div className="mt-0.5 text-sm opacity-70">{sub}</div>
    </div>
  )
}

function AuthLayout({ title, text, children, footer }: { title: string; text: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <Link to="/welcome" className="-ml-2 flex size-11 items-center justify-center rounded-full text-ink-2 hover:bg-sunken" aria-label="Zurück"><ArrowLeft className="size-5" /></Link>
        <div className="mt-6 animate-rise">
          <h1 className="font-display text-4xl font-medium">{title}</h1>
          <p className="mt-2 text-ink-3">{text}</p>
        </div>
        <div className="mt-8 animate-rise">{children}</div>
        <div className="mt-auto pt-8 text-center text-sm text-ink-3">{footer}</div>
      </div>
    </div>
  )
}

function PasswordField({ value, onChange, label = 'Passwort', autoComplete }: { value: string; onChange: (v: string) => void; label?: string; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <TextField label={label} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'} className="absolute bottom-1 right-1 flex size-10 items-center justify-center rounded-xl text-ink-3">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

function ProtoNote() {
  return <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-3"><ShieldCheck className="size-3.5" /> Prototyp – es werden keine Daten übertragen.</p>
}

export function LoginPage() {
  const { dispatch } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!emailOk(email) || !pw) return setError('Bitte E-Mail-Adresse und Passwort eingeben.')
    dispatch({ type: 'login' })
    navigate('/')
  }
  return (
    <AuthLayout title="Willkommen zurück" text="Schön, dass ihr wieder da seid." footer={<>Noch kein Konto? <Link to="/register" className="font-semibold text-sage-600">Registrieren</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField label="E-Mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField value={pw} onChange={setPw} autoComplete="current-password" />
        <div className="text-right"><Link to="/reset" className="text-sm font-semibold text-sage-600">Passwort vergessen?</Link></div>
        {error && <p role="alert" className="rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{error}</p>}
        <Button type="submit" size="lg" block>Anmelden</Button>
        <ProtoNote />
      </form>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const { dispatch } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const strength = [pw.length >= 10, /[A-Z]/.test(pw) && /[a-z]/.test(pw), /\d|[^A-Za-z]/.test(pw)].filter(Boolean).length
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Wie dürfen wir dich nennen?')
    if (!emailOk(email)) return setError('Bitte eine gültige E-Mail-Adresse eingeben.')
    if (pw.length < 10) return setError('Das Passwort braucht mindestens 10 Zeichen.')
    if (!consent) return setError('Bitte bestätige die Datenschutzhinweise.')
    dispatch({ type: 'login' })
    navigate('/')
  }
  return (
    <AuthLayout title="Konto erstellen" text="In einer Minute startklar – danach legst du das Profil deines Hundes an." footer={<>Schon registriert? <Link to="/login" className="font-semibold text-sage-600">Anmelden</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField label="Vorname" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="E-Mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <PasswordField value={pw} onChange={setPw} autoComplete="new-password" />
          <div className="mt-2 flex gap-1.5 px-1">
            {[0, 1, 2].map((i) => <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? (strength === 3 ? 'bg-good' : 'bg-honey-400') : 'bg-line'}`} />)}
          </div>
          <p className="mt-1.5 px-1 text-xs text-ink-3">Mindestens 10 Zeichen. Gerne ein Satz, den du dir gut merken kannst.</p>
        </div>
        <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-2">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 accent-[var(--color-sage-600)]" />
          <span>Ich habe die Datenschutzhinweise gelesen. Meine Daten werden nur zur Bereitstellung der App verwendet – ohne Tracking oder Werbung.</span>
        </label>
        {error && <p role="alert" className="rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{error}</p>}
        <Button type="submit" size="lg" block>Konto erstellen</Button>
        <ProtoNote />
      </form>
    </AuthLayout>
  )
}

export function ResetPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <AuthLayout title="Passwort zurücksetzen" text="Wir schicken dir einen Link, mit dem du ein neues Passwort festlegen kannst." footer={<Link to="/login" className="font-semibold text-sage-600">Zurück zur Anmeldung</Link>}>
      {sent ? (
        <div className="animate-rise rounded-3xl bg-sage-50 p-6 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sage-100 text-sage-700"><Mail className="size-6" /></span>
          <h2 className="font-display mt-4 text-2xl">Schau in dein Postfach</h2>
          {/* Bewusst neutral formuliert, damit nicht erkennbar ist, ob ein Konto existiert */}
          <p className="mt-2 text-sm text-ink-2">Falls ein Konto zu <span className="font-semibold">{email}</span> existiert, erhältst du in Kürze eine E-Mail. Der Link ist 60 Minuten gültig.</p>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (emailOk(email)) setSent(true) }} className="space-y-4" noValidate>
          <TextField label="E-Mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="lg" block icon={Lock} disabled={!emailOk(email)}>Link anfordern</Button>
          <ProtoNote />
        </form>
      )}
    </AuthLayout>
  )
}
