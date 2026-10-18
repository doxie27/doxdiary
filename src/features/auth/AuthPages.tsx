import { ArrowLeft, ArrowRight, CircleCheck, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { authApi } from '../../api/endpoints'
import { Brand } from '../../components/layout/AppShell'
import { LegalLinks } from '../../components/layout/LegalLinks'
import { useLegal } from '../../api/useLegal'
import { Button, TextField } from '../../components/ui'
import { useStore } from '../../store/AppStore'

/**
 * Anmelde-Oberflächen. Clientseitige Prüfungen sind nur Komfort –
 * maßgeblich ist die Validierung der PHP-API (Session + CSRF).
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
          <button onClick={() => { dispatch({ type: 'demoLogin' }); navigate('/') }} className="mt-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-sage-600">
            <Sparkles className="size-4" /> Prototyp mit Beispieldaten ansehen
          </button>
          <LegalLinks className="mt-2" />
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

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null
  return <p role="alert" className="rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{error}</p>
}

/** Fehlermeldung aus der API – bei Feldfehlern die erste konkrete Meldung. */
function message(e: unknown): string {
  if (e instanceof ApiError) return Object.values(e.fields)[0] ?? e.message
  return 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
}

/** Kleiner Helfer für Formulare mit Ladezustand und Fehlermeldung. */
function useSubmit() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, run }
}

export function LoginPage() {
  const { dispatch } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const { busy, error, setError, run } = useSubmit()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!emailOk(email) || !pw) return setError('Bitte E-Mail-Adresse und Passwort eingeben.')
    run(async () => {
      const session = await authApi.login(email.trim(), pw)
      dispatch({ type: 'liveSession', ...session })
      navigate('/', { replace: true })
    })
  }
  return (
    <AuthLayout title="Willkommen zurück" text="Schön, dass ihr wieder da seid." footer={<>Noch kein Konto? <Link to="/register" className="font-semibold text-sage-600">Registrieren</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField label="E-Mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField value={pw} onChange={setPw} autoComplete="current-password" />
        <div className="text-right"><Link to="/reset" className="text-sm font-semibold text-sage-600">Passwort vergessen?</Link></div>
        <ErrorBox error={error} />
        <Button type="submit" size="lg" block disabled={busy}>{busy ? 'Anmelden …' : 'Anmelden'}</Button>
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
  const legal = useLegal()
  const { busy, error, setError, run } = useSubmit()
  const strength = [pw.length >= 10, /[A-Z]/.test(pw) && /[a-z]/.test(pw), /\d|[^A-Za-z]/.test(pw)].filter(Boolean).length
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Wie dürfen wir dich nennen?')
    if (!emailOk(email)) return setError('Bitte eine gültige E-Mail-Adresse eingeben.')
    if (pw.length < 10) return setError('Das Passwort braucht mindestens 10 Zeichen.')
    if (!consent) return setError('Bitte bestätige die Datenschutzhinweise.')
    run(async () => {
      const session = await authApi.register(name.trim(), email.trim(), pw, consent)
      dispatch({ type: 'liveSession', ...session })
      navigate('/', { replace: true })
    })
  }
  return (
    <AuthLayout title="Konto erstellen" text="In einer Minute startklar – danach legst du das Profil deines Hundes an." footer={<>Schon registriert? <Link to="/login" className="font-semibold text-sage-600">Anmelden</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField label="Vorname" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
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
          <span>
            Ich habe die {legal.privacyUrl ? <a href={legal.privacyUrl} target="_blank" rel="noopener" className="font-semibold text-sage-600 underline underline-offset-2">Datenschutzhinweise</a> : 'Datenschutzhinweise'} gelesen. Meine Daten werden nur zur Bereitstellung der App verwendet – ohne Tracking oder Werbung.
          </span>
        </label>
        <ErrorBox error={error} />
        <Button type="submit" size="lg" block disabled={busy}>{busy ? 'Konto wird erstellt …' : 'Konto erstellen'}</Button>
      </form>
    </AuthLayout>
  )
}

export function ResetPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const { busy, error, run } = useSubmit()
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
        <form onSubmit={(e) => { e.preventDefault(); if (emailOk(email)) run(async () => { await authApi.forgot(email.trim()); setSent(true) }) }} className="space-y-4" noValidate>
          <TextField label="E-Mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <ErrorBox error={error} />
          <Button type="submit" size="lg" block icon={Lock} disabled={!emailOk(email) || busy}>Link anfordern</Button>
        </form>
      )}
    </AuthLayout>
  )
}

/** Ziel des Links aus der Reset-Mail: /reset/confirm?token=… */
export function ResetConfirmPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [pw, setPw] = useState('')
  const [done, setDone] = useState(false)
  const { busy, error, setError, run } = useSubmit()
  return (
    <AuthLayout title="Neues Passwort" text="Wähle ein neues Passwort für dein Konto. Danach wirst du auf allen Geräten abgemeldet." footer={<Link to="/login" className="font-semibold text-sage-600">Zur Anmeldung</Link>}>
      {done ? (
        <div className="animate-rise rounded-3xl bg-sage-50 p-6 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sage-100 text-sage-700"><CircleCheck className="size-6" /></span>
          <h2 className="font-display mt-4 text-2xl">Passwort geändert</h2>
          <p className="mt-2 text-sm text-ink-2">Du kannst dich jetzt mit deinem neuen Passwort anmelden.</p>
          <Link to="/login" className="mt-5 inline-flex h-12 items-center rounded-2xl bg-sage-600 px-5 font-semibold text-white">Anmelden</Link>
        </div>
      ) : !token ? (
        <ErrorBox error="Dieser Link ist unvollständig. Bitte öffne den Link aus der E-Mail erneut oder fordere einen neuen an." />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (pw.length < 10) return setError('Das Passwort braucht mindestens 10 Zeichen.')
            run(async () => { await authApi.reset(token, pw); setDone(true) })
          }}
          className="space-y-4"
          noValidate
        >
          <PasswordField label="Neues Passwort" value={pw} onChange={setPw} autoComplete="new-password" />
          <ErrorBox error={error} />
          <Button type="submit" size="lg" block disabled={busy}>Passwort speichern</Button>
        </form>
      )}
    </AuthLayout>
  )
}

/** Ziel des Bestätigungslinks: /verify-email?token=… – funktioniert mit und ohne Anmeldung. */
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { state, dispatch } = useStore()
  const [status, setStatus] = useState<'busy' | 'ok' | 'error'>(token ? 'busy' : 'error')
  const [error, setError] = useState('Dieser Link ist unvollständig. Bitte öffne den Link aus der E-Mail erneut.')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    authApi
      .verifyEmail(token)
      .then(() => !cancelled && setStatus('ok'))
      .catch((e) => {
        if (cancelled) return
        setError(message(e))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (status === 'ok' && state.authed && state.user.emailVerified === false) dispatch({ type: 'updateUser', user: { ...state.user, emailVerified: true } })
  }, [status, state.authed, state.user, dispatch])

  return (
    <AuthLayout title="E-Mail bestätigen" text="Einen Moment – wir prüfen deinen Link." footer={<Link to={state.authed ? '/' : '/login'} className="font-semibold text-sage-600">{state.authed ? 'Zur App' : 'Zur Anmeldung'}</Link>}>
      {status === 'busy' && <p className="text-ink-3">Wird bestätigt …</p>}
      {status === 'ok' && (
        <div className="animate-rise rounded-3xl bg-sage-50 p-6 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sage-100 text-sage-700"><CircleCheck className="size-6" /></span>
          <h2 className="font-display mt-4 text-2xl">Danke, bestätigt!</h2>
          <p className="mt-2 text-sm text-ink-2">Deine E-Mail-Adresse ist bestätigt. Du kannst dein Passwort jetzt jederzeit zurücksetzen.</p>
          <Link to={state.authed ? '/' : '/login'} className="mt-5 inline-flex h-12 items-center rounded-2xl bg-sage-600 px-5 font-semibold text-white">{state.authed ? 'Weiter zur App' : 'Anmelden'}</Link>
        </div>
      )}
      {status === 'error' && <ErrorBox error={error} />}
    </AuthLayout>
  )
}
