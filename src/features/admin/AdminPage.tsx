import { Download, EyeOff, Lock, LockOpen, Mail, RefreshCw, Search, ShieldCheck, Trash } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { adminApi, type AdminStatus, type AdminUser } from '../../api/endpoints'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, Chip, IconButton, SectionHeader, Sheet, TextField, useToast } from '../../components/ui'
import { cn } from '../../lib/cn'
import { fmt, relativeDay } from '../../lib/format'
import { useStore } from '../../store/AppStore'

const actionLabels: Record<string, string> = {
  backup: 'Backup heruntergeladen',
  backup_token: 'Backup automatisch abgeholt',
  lock: 'Konto gesperrt',
  unlock: 'Konto entsperrt',
  send_reset: 'Reset-Mail gesendet',
  delete_user: 'Konto gelöscht',
  auto_delete_unverified: 'Unbestätigtes Konto automatisch gelöscht',
}

const mb = (bytes: number) => `${fmt.num(bytes / 1_048_576)} MB`
const errorText = (e: unknown) => (e instanceof ApiError ? (Object.values(e.fields)[0] ?? e.message) : 'Etwas ist schiefgelaufen.')

/**
 * Administration: Betrieb und Kontoverwaltung. Bewusst ohne Einsicht in
 * Hunde-, Gesundheits-, Trainings- oder Tagebuchinhalte.
 */
export function AdminPage() {
  const { state } = useStore()
  const toast = useToast()
  const [status, setStatus] = useState<AdminStatus | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [audit, setAudit] = useState<Array<{ action: string; at: string; target: string | null }>>([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [backupOpen, setBackupOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, u, a] = await Promise.all([adminApi.status(), adminApi.users(), adminApi.audit()])
      setStatus(s)
      setUsers(u)
      setAudit(a)
      setLoadError(null)
    } catch (e) {
      setLoadError(errorText(e))
    }
  }, [])

  useEffect(() => {
    if (state.user.isAdmin) load()
  }, [state.user.isAdmin, load])

  const filtered = useMemo(() => users.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase())), [users, q])

  if (!state.user.isAdmin) return <Navigate to="/" replace />

  const sys = status?.system
  const st = status?.stats
  const maxWeek = Math.max(1, ...(st?.sessionsPerWeek.map((w) => w.sessions) ?? [1]))

  return (
    <div className="pb-8">
      <PageHeader title="Administration" back="/account" actions={<IconButton icon={RefreshCw} label="Aktualisieren" onClick={() => { load(); toast('Aktualisiert') }} />} />
      <div className="stagger space-y-7 px-5 lg:px-8">
        <Card className="flex items-start gap-3 bg-sunken/60 p-4 shadow-none">
          <EyeOff className="mt-0.5 size-5 shrink-0 text-sage-600" />
          <p className="text-sm text-ink-2">Hier siehst du Kontodaten und Zahlen. Hundeprofile, Gesundheitshinweise, Trainings und Tagebücher anderer Nutzer:innen bleiben privat und sind nicht einsehbar.</p>
        </Card>

        {loadError && <p role="alert" className="rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{loadError}</p>}

        {st && (
          <section>
            <SectionHeader title="Überblick" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Kpi value={st.users} label="Konten" sub={`${st.usersVerified} bestätigt`} />
              <Kpi value={st.activeLast30Days} label="Aktiv" sub="letzte 30 Tage" />
              <Kpi value={st.dogs} label="Hunde" sub="Profile gesamt" />
              <Kpi value={st.sessions} label="Einheiten" sub="Training gesamt" />
              <Kpi value={st.diaryEntries} label="Einträge" sub="Tagebuch gesamt" />
              <Kpi value={st.usersLocked} label="Gesperrt" sub="Konten" />
            </div>
            {st.sessionsPerWeek.length > 0 && (
              <Card className="mt-3 p-5">
                <div className="mb-4 text-sm font-semibold">Trainingseinheiten pro Woche · alle Konten</div>
                <div className="flex h-28 items-end gap-2">
                  {st.sessionsPerWeek.map((w, i) => (
                    <div key={w.week} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`Woche ab ${fmt.dateShort(w.week)}: ${w.sessions}`}>
                      <span className="text-[11px] font-semibold tabular-nums text-ink-3">{w.sessions || ''}</span>
                      <span className={cn('w-full max-w-7 rounded-t-[4px]', i === st.sessionsPerWeek.length - 1 ? 'bg-sage-600' : 'bg-sage-300')} style={{ height: `${Math.max(w.sessions ? 4 : 0, (w.sessions / maxWeek) * 100)}%` }} />
                      <span className="text-[10px] font-medium text-ink-3">{fmt.dateShort(w.week).replace('.', '')}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </section>
        )}

        {sys && (
          <section>
            <SectionHeader title="System" />
            <Card className="divide-y divide-line text-sm">
              <Line label="PHP" value={sys.php} />
              <Line label="Datenbank" value={sys.database} />
              <Line label="Migrationen" value={`${sys.migrationsApplied} / ${sys.migrationsAvailable} · ${sys.latestMigration}`} ok={sys.migrationsApplied === sys.migrationsAvailable} />
              <Line label="Fotos" value={`${sys.uploadsCount} · ${mb(sys.uploadsBytes)}`} />
              <Line label="Fehler (30 Tage)" value={String(sys.errorsLast30Days)} ok={sys.errorsLast30Days === 0} />
              <Line label="Mailversand" value={sys.mailDriver === 'smtp' ? 'SMTP' : sys.mailDriver} ok={sys.mailDriver === 'smtp'} />
              <Line label="Backup-Passwort" value={sys.backupEncrypted ? 'Gesetzt' : 'Fehlt – in config.php setzen'} ok={sys.backupEncrypted} />
              <Line label="Automatische Abholung" value={sys.backupTokenConfigured ? 'Eingerichtet' : 'Nicht eingerichtet'} />
              <Line label="Letztes Backup" value={sys.lastBackupAt ? `${relativeDay(sys.lastBackupAt)}, ${fmt.time(sys.lastBackupAt)} Uhr` : 'Noch keines'} ok={!!sys.lastBackupAt && Date.now() - new Date(sys.lastBackupAt).getTime() < 8 * 86_400_000} />
            </Card>
            <Button block icon={Download} className="mt-3" disabled={!sys.backupEncrypted} onClick={() => setBackupOpen(true)}>Backup herunterladen</Button>
            {!sys.backupEncrypted && <p className="mt-2 px-1 text-xs text-ink-3">Backups werden nur verschlüsselt ausgegeben. Lege dafür <code>backup.password</code> in der config.php fest.</p>}
          </section>
        )}

        <section>
          <SectionHeader title={`Konten (${users.length})`} />
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name oder E-Mail suchen" className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-4 text-base focus:border-sage-400 focus:outline-none focus:ring-4 focus:ring-sage-100" />
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {filtered.map((u) => (
              <button key={u.id} onClick={() => setSelected(u)} className="text-left">
                <Card className="p-4 transition hover:border-line-strong">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{u.name || '–'}{u.id === state.user.id && <span className="font-normal text-ink-3"> (du)</span>}</div>
                      <div className="truncate text-sm text-ink-3">{u.email}</div>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {!u.verified && <Chip className="bg-honey-100 text-warn">unbestätigt</Chip>}
                      {u.locked && <Chip className="bg-clay-100 text-alert">gesperrt</Chip>}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-ink-3">
                    {u.dogs} {u.dogs === 1 ? 'Hund' : 'Hunde'} · seit {fmt.dateShort(u.createdAt)} · {u.lastLoginAt ? `zuletzt ${relativeDay(u.lastLoginAt).toLowerCase()}` : 'nie angemeldet'}
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </section>

        {audit.length > 0 && (
          <section>
            <SectionHeader title="Protokoll" />
            <Card className="divide-y divide-line text-sm">
              {audit.slice(0, 15).map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium">{actionLabels[e.action] ?? e.action}</div>
                    {e.target && <div className="truncate text-xs text-ink-3">{e.target}</div>}
                  </div>
                  <span className="shrink-0 text-xs text-ink-3">{relativeDay(e.at)} {fmt.time(e.at)}</span>
                </div>
              ))}
            </Card>
          </section>
        )}
      </div>

      <BackupSheet open={backupOpen} onClose={() => setBackupOpen(false)} onDone={load} encrypted={!!sys?.backupEncrypted} />
      {selected && <UserSheet user={selected} self={selected.id === state.user.id} onClose={() => setSelected(null)} onChanged={load} />}
    </div>
  )
}

function Kpi({ value, label, sub }: { value: number; label: string; sub: string }) {
  return (
    <Card className="p-4">
      <div className="font-display text-3xl font-medium tabular-nums">{value}</div>
      <div className="mt-0.5 text-sm font-semibold">{label}</div>
      <div className="text-xs text-ink-3">{sub}</div>
    </Card>
  )
}

function Line({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-ink-3">{label}</span>
      <span className="flex items-center gap-2 text-right font-medium">
        {value}
        {ok !== undefined && <span className={cn('size-2 rounded-full', ok ? 'bg-good' : 'bg-honey-400')} aria-label={ok ? 'in Ordnung' : 'prüfen'} />}
      </span>
    </div>
  )
}

function BackupSheet({ open, onClose, onDone, encrypted }: { open: boolean; onClose: () => void; onDone: () => void; encrypted: boolean }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const download = async () => {
    setBusy(true)
    setError(null)
    try {
      const blob = await adminApi.backup(password)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `doxie-diary-backup-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(a.href)
      setPassword('')
      onClose()
      onDone()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Backup herunterladen">
      <p className="text-ink-2">Enthält die komplette Datenbank und alle Fotos als ZIP-Datei.</p>
      <p className="mt-2 text-sm text-ink-3">{encrypted ? 'Die Datei ist mit deinem Backup-Passwort aus der config.php verschlüsselt (AES-256). Öffnen z. B. mit 7-Zip.' : 'Backup-Passwort fehlt in der config.php.'}</p>
      <TextField className="mt-5" label="Dein Passwort zur Bestätigung" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p role="alert" className="mt-4 rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{error}</p>}
      <Button block icon={Download} className="mt-5" disabled={busy || !password} onClick={download}>{busy ? 'Wird erstellt …' : 'Herunterladen'}</Button>
    </Sheet>
  )
}

function UserSheet({ user, self, onClose, onChanged }: { user: AdminUser; self: boolean; onClose: () => void; onChanged: () => void }) {
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      toast(done)
      onChanged()
      onClose()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={user.name || user.email}>
      <div className="space-y-1 text-sm text-ink-2">
        <p>{user.email}</p>
        <p className="text-ink-3">
          Registriert am {fmt.dateFull(user.createdAt)} · {user.verified ? 'E-Mail bestätigt' : 'E-Mail unbestätigt'} · {user.dogs} {user.dogs === 1 ? 'Hund' : 'Hunde'}
        </p>
      </div>
      {error && <p role="alert" className="mt-4 rounded-2xl bg-clay-100 px-4 py-3 text-sm font-semibold text-alert">{error}</p>}
      {!confirmDelete ? (
        <div className="mt-6 grid grid-cols-1 gap-2.5">
          <Button variant="secondary" icon={Mail} block disabled={busy} onClick={() => run(() => adminApi.sendReset(user.id), 'Reset-Mail gesendet')}>Passwort-Reset-Mail senden</Button>
          {!self &&
            (user.locked ? (
              <Button variant="secondary" icon={LockOpen} block disabled={busy} onClick={() => run(() => adminApi.unlock(user.id), 'Konto entsperrt')}>Konto entsperren</Button>
            ) : (
              <Button variant="secondary" icon={Lock} block disabled={busy} onClick={() => run(() => adminApi.lock(user.id), 'Konto gesperrt')}>Konto sperren</Button>
            ))}
          {!self && <Button variant="danger" icon={Trash} block onClick={() => setConfirmDelete(true)}>Konto löschen …</Button>}
          {self && <p className="flex items-center gap-2 text-xs text-ink-3"><ShieldCheck className="size-4" /> Dein eigenes Konto verwaltest du unter „Konto“.</p>}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-ink-2">Das Konto wird mit allen Hunden, Trainings, Tagebucheinträgen und Fotos dauerhaft gelöscht. Nur auf ausdrücklichen Wunsch der Person.</p>
          <TextField label="Dein Admin-Passwort zur Bestätigung" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button variant="danger" block disabled={busy || !password} onClick={() => run(() => adminApi.remove(user.id, password), 'Konto gelöscht')}>Endgültig löschen</Button>
          <Button variant="ghost" block onClick={() => setConfirmDelete(false)}>Abbrechen</Button>
        </div>
      )}
    </Sheet>
  )
}
