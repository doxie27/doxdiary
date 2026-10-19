import { ChevronRight, Download, KeyRound, LogOut, Moon, RotateCcw, Shield, ShieldCheck, Smartphone, Stethoscope, Trash, Users, Volume2 } from 'lucide-react'
import { LegalLinks } from '../../components/layout/LegalLinks'
import { InstallSheet } from '../../components/layout/InstallSheet'
import { usePwa } from '../../pwa/usePwa'
import { setSoundEnabled, soundEnabled } from '../../lib/sound'
import { ApiError } from '../../api/client'
import { authApi, meApi } from '../../api/endpoints'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, DogPortrait, SectionHeader, Sheet, TextField, useToast } from '../../components/ui'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/AppStore'

export function AccountPage() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [editName, setEditName] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [changePw, setChangePw] = useState(false)
  const [install, setInstall] = useState(false)
  const [sound, setSound] = useState(soundEnabled)
  const { standalone } = usePwa()
  const [name, setName] = useState(state.user.firstName)
  const [lastName, setLastName] = useState(state.user.lastName)
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const u = state.user
  const live = state.mode === 'live'

  const attempt = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.fields)[0] ?? e.message) : 'Etwas ist schiefgelaufen.')
    } finally {
      setBusy(false)
    }
  }

  const closeSheets = () => {
    setEditName(false)
    setChangePw(false)
    setConfirmDelete(false)
    setPassword('')
    setNewPassword('')
    setError(null)
  }

  // Datenexport (DSGVO Art. 20): Server-Daten + bis Phase 3/4 noch lokal gespeicherte Bereiche
  const exportData = () => attempt(async () => {
    const { exercises, plans, sessions, diary } = state
    const server = live ? await meApi.export() : { format: 'doxie-diary/v1', exportedAt: new Date().toISOString(), user: state.user, dogs: state.dogs }
    const local = { exercises, plans, sessions, diary }
    const blob = new Blob([JSON.stringify({ ...(server as object), local }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `doxie-diary-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Export erstellt')
  })

  const logout = async () => {
    if (live) await authApi.logout().catch(() => null)
    dispatch({ type: 'logout' })
    navigate('/welcome')
  }

  return (
    <div className="pb-8">
      <PageHeader title="Konto" back="/" />
      <div className="stagger space-y-7 px-5 lg:px-8">
        <Card className="flex items-center gap-4 p-5">
          <span className="flex size-14 items-center justify-center rounded-full bg-sage-100 font-display text-2xl text-sage-700">{u.firstName.charAt(0)}</span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl">{u.firstName} {u.lastName}</div>
            <div className="truncate text-sm text-ink-3">{u.email}</div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setEditName(true)}>Bearbeiten</Button>
        </Card>

        {u.isAdmin && (
          <Card className="divide-y divide-line">
            <Row icon={<IconTile tone="bg-sage-100 text-sage-700"><ShieldCheck className="size-4" /></IconTile>} label="Administration" sub="Systemstatus, Backup, Konten" onClick={() => navigate('/admin')} />
          </Card>
        )}

        <section>
          <SectionHeader title="Deine Hunde" />
          <Card className="divide-y divide-line">
            {state.dogs.map((d) => (
              <Row key={d.id} icon={<DogPortrait dog={d} size={36} />} label={d.name} sub={d.breed} onClick={() => { dispatch({ type: 'selectDog', id: d.id }); navigate('/dog') }} />
            ))}
            <Row icon={<span className="flex size-9 items-center justify-center rounded-full border-2 border-dashed border-line-strong text-lg text-ink-3">+</span>} label="Hund hinzufügen" onClick={() => navigate('/dogs/new')} />
          </Card>
        </section>

        <section>
          <SectionHeader title="Teilen · bald verfügbar" />
          <Card className="divide-y divide-line">
            <Row icon={<IconTile><Users className="size-4" /></IconTile>} label="Familienmitglieder einladen" sub="Gemeinsam ein Tagebuch führen" soon />
            <Row icon={<IconTile><Stethoscope className="size-4" /></IconTile>} label="Physiotherapeut:in verbinden" sub="Pläne erhalten, Fortschritt freigeben" soon />
          </Card>
        </section>

        <section>
          <SectionHeader title="App & Darstellung" />
          <Card className="divide-y divide-line">
            {!standalone && <Row icon={<IconTile><Smartphone className="size-4" /></IconTile>} label="Als App installieren" sub="Zum Startbildschirm hinzufügen" onClick={() => setInstall(true)} />}
            <Row icon={<IconTile><Volume2 className="size-4" /></IconTile>} label="Signalton im Training" sub={sound ? 'An – bei Pausen und Timer-Ende' : 'Aus'} onClick={() => { setSoundEnabled(!sound); setSound(!sound) }} />
            <Row icon={<IconTile><Moon className="size-4" /></IconTile>} label="Dunkles Design" sub="Folgt in einer späteren Version" soon />
          </Card>
        </section>

        <section>
          <SectionHeader title="Datenschutz" />
          <Card className="divide-y divide-line">
            {live && <Row icon={<IconTile><KeyRound className="size-4" /></IconTile>} label="Passwort ändern" sub="Andere Geräte werden abgemeldet" onClick={() => setChangePw(true)} />}
            <Row icon={<IconTile><Download className="size-4" /></IconTile>} label="Meine Daten exportieren" sub="Alle Daten als JSON-Datei" onClick={exportData} />
            <Row icon={<IconTile><Shield className="size-4" /></IconTile>} label="Kein Tracking, keine Werbung" sub="Keine externen Analysedienste" />
            <Row icon={<IconTile tone="bg-clay-100 text-alert"><Trash className="size-4" /></IconTile>} label="Konto löschen" sub="Entfernt alle Daten unwiderruflich" onClick={() => setConfirmDelete(true)} danger />
          </Card>
        </section>

        <div className="grid grid-cols-1 gap-2.5">
          {!live && <Button variant="secondary" icon={RotateCcw} block onClick={() => { dispatch({ type: 'reset' }); toast('Beispieldaten wiederhergestellt') }}>Beispieldaten zurücksetzen</Button>}
          <Button variant="ghost" icon={LogOut} block onClick={logout}>Abmelden</Button>
        </div>
        <LegalLinks />
        <p className="text-center text-xs text-ink-3">Doxie Diary · {live ? 'Version 0.4' : 'Demo mit Beispieldaten'}</p>
      </div>

      <InstallSheet open={install} onClose={() => setInstall(false)} />

      <Sheet open={editName} onClose={closeSheets} title="Profil bearbeiten">
        <div className="space-y-4">
          <TextField label="Vorname" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <TextField label="Nachname" hint="optional" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} />
          <TextField label="E-Mail" value={u.email} disabled hint="Änderung folgt später" />
          {error && <p role="alert" className="rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{error}</p>}
          <Button block disabled={busy || !name.trim()} onClick={() => attempt(async () => {
            const user = live ? await meApi.update(name.trim(), lastName.trim()) : { ...u, firstName: name.trim(), lastName: lastName.trim() }
            dispatch({ type: 'updateUser', user })
            closeSheets()
            toast('Gespeichert')
          })}>Speichern</Button>
        </div>
      </Sheet>

      <Sheet open={changePw} onClose={closeSheets} title="Passwort ändern">
        <div className="space-y-4">
          <TextField label="Aktuelles Passwort" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <TextField label="Neues Passwort" hint="mind. 10 Zeichen" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          {error && <p role="alert" className="rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{error}</p>}
          <Button block disabled={busy || !password || newPassword.length < 10} onClick={() => attempt(async () => {
            await meApi.changePassword(password, newPassword)
            closeSheets()
            toast('Passwort geändert')
          })}>Passwort ändern</Button>
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={closeSheets} title="Konto löschen?">
        <p className="text-ink-2">Alle Hundeprofile, Trainingspläne, Einheiten, Tagebucheinträge und Fotos werden dauerhaft gelöscht. Tipp: Exportiere deine Daten vorher.</p>
        {live ? (
          <TextField className="mt-5" label="Zur Bestätigung dein Passwort" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        ) : (
          <p className="mt-3 rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-3">Im Demo-Modus werden dabei nur die Beispieldaten zurückgesetzt.</p>
        )}
        {error && <p role="alert" className="mt-4 rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{error}</p>}
        <div className="mt-6 grid grid-cols-1 gap-2.5">
          <Button variant="danger" block disabled={busy || (live && !password)} onClick={() => attempt(async () => {
            if (live) {
              await meApi.delete(password)
              try { localStorage.removeItem(`doxie-diary.local.${u.id}`) } catch { /* ignorieren */ }
            } else {
              dispatch({ type: 'reset' })
            }
            dispatch({ type: 'logout' })
            navigate('/welcome')
          })}>Endgültig löschen</Button>
          <Button variant="ghost" block onClick={closeSheets}>Abbrechen</Button>
        </div>
      </Sheet>
    </div>
  )
}

function IconTile({ children, tone = 'bg-sunken text-ink-2' }: { children: ReactNode; tone?: string }) {
  return <span className={cn('flex size-9 items-center justify-center rounded-xl', tone)}>{children}</span>
}

function Row({ icon, label, sub, onClick, soon, danger }: { icon: ReactNode; label: string; sub?: string; onClick?: () => void; soon?: boolean; danger?: boolean }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp onClick={onClick} className={cn('flex w-full items-center gap-3.5 px-4 py-3.5 text-left', onClick && 'transition hover:bg-sunken/50 active:bg-sunken', soon && 'opacity-60')}>
      {icon}
      <div className="min-w-0 flex-1">
        <div className={cn('font-semibold', danger && 'text-alert')}>{label}</div>
        {sub && <div className="truncate text-sm text-ink-3">{sub}</div>}
      </div>
      {soon ? <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">Bald</span> : onClick && <ChevronRight className="size-4 text-ink-3" />}
    </Comp>
  )
}
