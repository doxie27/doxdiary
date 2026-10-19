/**
 * End-to-End-Durchlauf gegen echte API + Datenbank (Live-Modus).
 *
 * Voraussetzungen: `npm run api` (PHP auf :8080, mail.driver = log) und
 * `npm run dev` (Vite auf :5173) laufen, Admin-Adresse in api/config.php.
 * Aufruf:  node e2e/live-flow.mjs   (Optionen über Umgebungsvariablen, siehe unten)
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.E2E_BASE ?? 'http://localhost:5173'
const MAIL_DIR = process.env.E2E_MAIL_DIR ?? path.resolve('api/storage/mail')
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'nico.sellmaier2712@outlook.de'
const SHOTS = process.env.E2E_SHOTS ?? ''
const email = `e2e-${Date.now()}@example.test`
const password = 'e2e-passwort-123'

const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'de-DE' })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
let failed = false

const step = (msg) => console.log('✔', msg)
const shot = async (name) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
const heading = (name) => page.getByRole('heading', { name, exact: true }).first()

/** Neueste Mail an eine Adresse (LogMailer-Dateien) */
function lastMail(to, contains = '') {
  const files = fs.readdirSync(MAIL_DIR).sort().reverse()
  for (const f of files) {
    const t = fs.readFileSync(path.join(MAIL_DIR, f), 'utf8')
    if (t.includes(`To: ${to}`) && t.includes(contains)) return t
  }
  throw new Error(`Keine Mail an ${to}`)
}
const link = (mail, route) => mail.match(new RegExp(`https?://\\S+/${route}\\?token=[\\w-]+`))[0]

async function register(addr) {
  await page.goto(`${BASE}/register`)
  await page.getByLabel('Vorname').fill('Nico')
  await page.getByLabel('E-Mail').fill(addr)
  await page.getByLabel('Passwort', { exact: true }).fill(password)
  await page.locator('input[type=checkbox]').check()
  await page.getByRole('button', { name: 'Konto erstellen' }).click()
}

async function createDog(name = 'Lola') {
  await page.getByText('Wer ist dein Hund?').waitFor()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Geburtsdatum').fill('2019-04-12')
  await page.getByLabel('Gewicht').fill('8.4')
  await page.getByRole('button', { name: 'Profil anlegen' }).click()
  await heading(name).waitFor()
}

try {
  // ── Registrierung & E-Mail-Bestätigung ──
  await register(email)
  await createDog()
  await page.getByText('Bitte bestätige deine E-Mail-Adresse').waitFor()
  await shot('01-dashboard-unverified')
  step('Registrierung, Onboarding, Hinweis zur Bestätigung')
  await page.goto(link(lastMail(email, 'bestätige'), 'verify-email'))
  await page.getByText('Danke, bestätigt!').waitFor()
  await page.goto(`${BASE}/`)
  await heading('Lola').waitFor()
  if (await page.getByText('Bitte bestätige deine E-Mail-Adresse').count()) throw new Error('Hinweis noch sichtbar')
  step('E-Mail per Link bestätigt, Hinweis verschwunden')

  // ── Übungen (Startvorlagen) & Plan ──
  await page.goto(`${BASE}/training/exercises`)
  await page.getByText('Sitz-Steh-Wechsel').waitFor()
  step('9 Startvorlagen vom Server geladen')
  await page.goto(`${BASE}/training/plans/new`)
  await page.getByLabel('Name').fill('E2E Morgenrunde')
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click()
  await page.getByRole('dialog').getByText('Sitz-Steh-Wechsel').click()
  await page.getByRole('dialog').getByText('Stand auf dem Balancekissen').click()
  await page.getByRole('button', { name: 'Schließen' }).click()
  await page.getByRole('button', { name: 'Plan erstellen' }).click()
  await heading('E2E Morgenrunde').waitFor()
  const planUrl = page.url()
  if (!/\/training\/plans\/\d+$/.test(planUrl)) throw new Error('Plan hat keine Server-ID: ' + planUrl)
  step('Plan auf dem Server angelegt')

  // ── Training durchführen & speichern ──
  await page.getByRole('button', { name: 'Training starten' }).click()
  await page.getByText('Los geht’s').click()
  for (let i = 0; i < 3; i++) await page.getByLabel('Wiederholung zählen').click()
  await page.getByRole('button', { name: 'Training pausieren' }).click()
  await page.getByText('Einheit abschließen').click()
  await page.getByText('Einheit speichern').click()
  await page.waitForURL('**/training/history')
  await page.reload()
  await page.getByText('E2E Morgenrunde').first().waitFor()
  step('Einheit gespeichert und nach Neuladen vom Server da')

  // ── Funkloch: Einheit offline speichern, später nachsenden ──
  await page.goto(planUrl)
  await page.getByRole('button', { name: 'Training starten' }).click()
  await page.getByText('Los geht’s').click()
  await ctx.setOffline(true)
  await page.getByRole('button', { name: 'Training pausieren' }).click()
  await page.getByText('Einheit abschließen').click()
  await page.getByText('Einheit speichern').click()
  await page.getByText('wird übertragen, sobald du online bist').waitFor()
  await page.getByText('wird übertragen').first().waitFor()
  step('Offline: Einheit in Warteschlange')
  await ctx.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await page.waitForFunction(() => !Object.keys(localStorage).some((k) => k.startsWith('doxie-diary.pending.')), null, { timeout: 10000 })
  await page.reload()
  await page.getByRole('heading', { name: 'Training', exact: true }).waitFor()
  const rows = await page.getByText('E2E Morgenrunde').count()
  if (rows !== 2) throw new Error(`Erwartet 2 Einheiten, gefunden ${rows}`)
  step('Wieder online: nachgesendet, keine Doppelung')

  // ── Tagebuch mit Foto ──
  await page.goto(`${BASE}/diary?new=1`)
  await page.getByLabel('Titel').fill('E2E Ausflug')
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  await page.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('dialog').locator('img').first().waitFor()
  await page.getByRole('button', { name: 'Speichern' }).click()
  await page.getByText('E2E Ausflug').waitFor()
  await page.reload()
  await page.getByText('E2E Ausflug').waitFor()
  const src = await page.locator('main img').first().getAttribute('src')
  if (!src?.includes('/api/v1/media/')) throw new Error('Foto nicht vom Server: ' + src)
  const ok = await page.evaluate(async (u) => (await fetch(u)).ok, src)
  if (!ok) throw new Error('Foto nicht abrufbar')
  await shot('02-diary')
  step('Tagebucheintrag mit Foto auf dem Server')

  // ── Highlight, Rückblick & Tierarzt-Bericht als PDF ──
  await page.getByRole('button', { name: 'Als Highlight markieren' }).first().click()
  await page.getByText('Als Highlight markiert').waitFor()
  await page.reload()
  await page.getByRole('button', { name: 'Highlight entfernen' }).first().waitFor()
  await page.goto(`${BASE}/review`)
  await page.getByText('Die schönsten Momente').count() // Vorschau zeigt Highlights
  await page.getByRole('heading', { name: 'Highlights' }).or(page.getByText('HIGHLIGHTS')).first().waitFor()
  for (const mode of ['review', 'vet']) {
    if (mode === 'vet') await page.getByRole('tab', { name: 'Tierarzt/Physio' }).click()
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: 'PDF erstellen' }).click()])
    const pdfPath = await dl.path()
    const head = fs.readFileSync(pdfPath).subarray(0, 5).toString()
    if (head !== '%PDF-' || fs.statSync(pdfPath).size < 5000) throw new Error(`PDF ungültig (${mode})`)
    step(`${mode === 'review' ? 'Rückblick' : 'Tierarzt-Bericht'} als PDF (${Math.round(fs.statSync(pdfPath).size / 1024)} KB): ${dl.suggestedFilename()}`)
  }

  // ── Datenschutz: nichts Sensibles im Browser-Speicher ──
  const leaked = await page.evaluate(() => Object.values(localStorage).some((v) => v.includes('E2E Ausflug') || v.includes('E2E Morgenrunde')))
  if (leaked) throw new Error('Inhalte im localStorage gefunden')
  step('Keine Trainings- oder Tagebuchinhalte im localStorage')

  // ── Import alter lokaler Daten (vor Phase 3) ──
  const userId = await page.evaluate(() => Object.keys(localStorage).find((k) => k.startsWith('doxie-diary.selected.'))?.split('.').pop())
  const dogId = await page.evaluate((k) => localStorage.getItem(k), `doxie-diary.selected.${userId}`)
  await page.getByRole('link', { name: 'Konto' }).first().click().catch(() => page.goto(`${BASE}/account`))
  await page.goto(`${BASE}/account`)
  await page.getByRole('button', { name: 'Abmelden' }).click()
  await page.waitForURL('**/welcome')
  await page.evaluate(({ userId, dogId }) => {
    const ex = { id: 'e1', name: 'Sitz-Steh-Wechsel', description: '', category: 'kraft', reps: 8, sets: 2, durationSec: null, restSec: 30, equipment: [], notes: '', mediaUrl: null, source: { kind: 'owner', name: '' } }
    localStorage.setItem(`doxie-diary.local.${userId}`, JSON.stringify({
      selectedDogId: dogId,
      exercises: [ex],
      plans: [{ id: 'plan-alt', dogId, name: 'Alter lokaler Plan', description: '', weekdays: [1], timeOfDay: null, items: [{ id: 'it-alt', exerciseId: 'e1', reps: null, sets: null, durationSec: null, restSec: null }], archived: false, source: { kind: 'owner', name: '' }, createdAt: new Date().toISOString() }],
      sessions: [],
      diary: [{ id: 'entry-alt-1', dogId, at: new Date(Date.now() - 86400000).toISOString(), category: 'alltag', title: 'Alter lokaler Eintrag', text: 'von vor dem Update', photos: [] }],
    }))
  }, { userId, dogId })
  await page.goto(`${BASE}/login`)
  await page.getByLabel('E-Mail').fill(email)
  await page.getByLabel('Passwort', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await page.getByText('Deine bisherigen Daten wurden übernommen').waitFor()
  await page.goto(`${BASE}/diary`)
  await page.locator('main').getByText('Alter lokaler Eintrag').first().waitFor()
  await page.goto(`${BASE}/training`)
  await page.locator('main').getByText('Alter lokaler Plan').first().waitFor()
  const stillLocal = await page.evaluate((k) => localStorage.getItem(k), `doxie-diary.local.${userId}`)
  if (stillLocal) throw new Error('Lokale Altdaten nicht entfernt')
  step('Alte lokale Daten übernommen und aus dem Browser entfernt')

  // ── Admin ──
  await page.goto(`${BASE}/account`)
  await page.getByRole('button', { name: 'Abmelden' }).click()
  await page.waitForURL('**/welcome')
  await page.goto(`${BASE}/login`)
  await page.getByLabel('E-Mail').fill(ADMIN_EMAIL)
  await page.getByLabel('Passwort', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Anmelden' }).click()
  const loggedIn = await Promise.race([
    page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 4000 }).then(() => true),
    page.getByRole('alert').waitFor({ timeout: 4000 }).then(() => false),
  ]).catch(() => false)
  if (!loggedIn) {
    await register(ADMIN_EMAIL)
    await createDog('Bruno')
    await page.goto(link(lastMail(ADMIN_EMAIL, 'bestätige'), 'verify-email'))
    await page.getByText('Danke, bestätigt!').waitFor()
  }
  await page.goto(`${BASE}/admin`)
  await page.getByText('Überblick').waitFor()
  await page.getByText(email).waitFor()
  const adminText = await page.locator('main').innerText()
  if (adminText.includes('E2E Ausflug') || adminText.includes('Bandscheibe')) throw new Error('Admin sieht Inhalte')
  await shot('03-admin')
  step('Admin-Bereich: Status und Konten, keine Inhalte')
  await page.getByRole('button', { name: 'Backup herunterladen' }).click()
  await page.getByLabel('Dein Login-Passwort zur Bestätigung').fill(password)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Herunterladen', exact: true }).click()])
  const file = await download.path()
  if (!file || fs.statSync(file).size < 500) throw new Error('Backup leer')
  step(`Backup heruntergeladen (${Math.round(fs.statSync(file).size / 1024)} KB)`)
} catch (e) {
  failed = true
  console.error('✘', e.message)
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'failure.png') }).catch(() => null)
} finally {
  const relevant = errors.filter((e) => !e.includes('401'))
  if (relevant.length) console.log('Konsolenfehler:', relevant)
  await browser.close()
  process.exit(failed ? 1 : 0)
}
