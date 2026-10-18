import { ChevronRight, Download, LogOut, Moon, RotateCcw, Shield, Stethoscope, Trash, Users } from 'lucide-react'
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
  const [name, setName] = useState(state.user.firstName)
  const u = state.user

  // Datenexport (DSGVO Art. 20) – im Prototyp als JSON direkt im Browser erzeugt
  const exportData = () => {
    const { authed: _a, selectedDogId: _s, ...data } = state
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), format: 'doxie-diary/v1', ...data }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `doxie-diary-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Export erstellt')
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
          <SectionHeader title="Darstellung" />
          <Card className="divide-y divide-line">
            <Row icon={<IconTile><Moon className="size-4" /></IconTile>} label="Dunkles Design" sub="Folgt in einer späteren Version" soon />
          </Card>
        </section>

        <section>
          <SectionHeader title="Datenschutz" />
          <Card className="divide-y divide-line">
            <Row icon={<IconTile><Download className="size-4" /></IconTile>} label="Meine Daten exportieren" sub="Alle Daten als JSON-Datei" onClick={exportData} />
            <Row icon={<IconTile><Shield className="size-4" /></IconTile>} label="Kein Tracking, keine Werbung" sub="Keine externen Analysedienste" />
            <Row icon={<IconTile tone="bg-clay-100 text-alert"><Trash className="size-4" /></IconTile>} label="Konto löschen" sub="Entfernt alle Daten unwiderruflich" onClick={() => setConfirmDelete(true)} danger />
          </Card>
        </section>

        <div className="grid grid-cols-1 gap-2.5">
          <Button variant="secondary" icon={RotateCcw} block onClick={() => { dispatch({ type: 'reset' }); toast('Beispieldaten wiederhergestellt') }}>Beispieldaten zurücksetzen</Button>
          <Button variant="ghost" icon={LogOut} block onClick={() => { dispatch({ type: 'logout' }); navigate('/welcome') }}>Abmelden</Button>
        </div>
        <p className="text-center text-xs text-ink-3">Doxie Diary · Prototyp 0.1</p>
      </div>

      <Sheet open={editName} onClose={() => setEditName(false)} title="Profil bearbeiten">
        <div className="space-y-4">
          <TextField label="Vorname" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <TextField label="E-Mail" value={u.email} disabled hint="Änderung mit Bestätigungs-Mail (Phase 2)" />
          <Button block onClick={() => { if (name.trim()) { dispatch({ type: 'updateUser', user: { ...u, firstName: name.trim() } }); setEditName(false); toast('Gespeichert') } }}>Speichern</Button>
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Konto löschen?">
        <p className="text-ink-2">Alle Hundeprofile, Trainingspläne, Einheiten, Tagebucheinträge und Fotos werden dauerhaft gelöscht. Tipp: Exportiere deine Daten vorher.</p>
        <p className="mt-3 rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-3">Im Prototyp werden dabei nur die Beispieldaten zurückgesetzt.</p>
        <div className="mt-6 grid grid-cols-1 gap-2.5">
          <Button variant="danger" block onClick={() => { dispatch({ type: 'reset' }); dispatch({ type: 'logout' }); navigate('/welcome') }}>Endgültig löschen</Button>
          <Button variant="ghost" block onClick={() => setConfirmDelete(false)}>Abbrechen</Button>
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
