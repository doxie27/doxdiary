import { diaryCategories, feedbackMeta } from '../../../data/meta'
import type { Dog, Weekday } from '../../../data/types'
import { ageFrom } from '../../../lib/date'
import { fmt, weekdayShort } from '../../../lib/format'
import type { Period } from '../period'
import type { ReviewData, VetReportData } from '../summary'
import { A4, C, Doc, loadPhoto, M, W } from './doc'

/**
 * PDF-Layouts: „Rückblick“ (Woche/Monat; bei einem Jahr = Erinnerungsbuch)
 * und „Bericht für Tierarzt/Physio“. Wird nur bei Bedarf geladen.
 */

const created = () => new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
const sexLabel = (d: Dog) => (d.sex === 'female' ? 'Hündin' : 'Rüde')

// ── Rückblick / Erinnerungsbuch ────────────────────────────────────────

export async function createReviewPdf(o: { dog: Dog; period: Period; title: string; data: ReviewData; withPhotos: boolean }): Promise<Blob> {
  const { dog, period, title, data, withPhotos } = o
  const doc = await Doc.create(`${title} – Doxie Diary`)
  const f = doc.f

  // Titelseite
  doc.newPage(C.canvas)
  doc.logo(M, M, 26)
  doc.label('Doxie Diary', M + 34, M + 6, { font: f.display, size: 13, color: C.sage })
  const coverUrl = withPhotos ? (data.highlights.find((e) => e.photos[0])?.photos[0] ?? data.photos[0] ?? dog.photoUrl) : null
  const cover = coverUrl ? await loadPhoto(doc, coverUrl, W / 400, 1400) : null
  let top = M + 64
  if (cover) {
    doc.image(cover, M, top, W, 400)
    top += 400 + 36
  } else {
    doc.round(M, top, W, 300, 18, C.sage100)
    doc.label(dog.name.charAt(0), M + W / 2, top + 70, { font: f.display, size: 150, color: C.sage300, align: 'center' })
    top += 300 + 36
  }
  doc.y = top
  doc.text(period.range, { size: 11, color: C.ink3 })
  doc.y += 2
  doc.text(title, { font: f.display, size: 38, lineHeight: 44 })
  doc.y += 6
  const age = ageFrom(dog.birthDate)
  doc.text([dog.breed, `${age.years} Jahre`, `${fmt.num(dog.weightKg)} kg`].filter(Boolean).join(' · '), { size: 11, color: C.ink2 })

  // Kennzahlen unten auf der Titelseite
  const n = (v: number, one: string, many: string): [string, string] => [String(v), v === 1 ? one : many]
  const stats: Array<[string, string]> = [
    n(data.stats.entries, 'Eintrag', 'Einträge'),
    n(data.stats.photos, 'Foto', 'Fotos'),
    n(data.stats.sessions, 'Training', 'Trainings'),
    n(data.stats.activeMinutes, 'Minute aktiv', 'Minuten aktiv'),
  ]
  const boxW = (W - 3 * 10) / 4
  const boxTop = A4.h - M - 70
  stats.forEach(([v, l], i) => {
    const x = M + i * (boxW + 10)
    doc.round(x, boxTop, boxW, 62, 12, C.white)
    doc.label(v, x + boxW / 2, boxTop + 12, { font: f.display, size: 22, align: 'center' })
    doc.label(l, x + boxW / 2, boxTop + 42, { size: 8, color: C.ink3, align: 'center' })
  })

  // Auf einen Blick
  doc.newPage()
  doc.overline('Auf einen Blick')
  doc.heading(data.stats.entries ? `${data.stats.entries} ${data.stats.entries === 1 ? 'Moment' : 'Momente'} mit ${dog.name}` : `Unterwegs mit ${dog.name}`, 22)
  if (data.categories.length) {
    const max = Math.max(...data.categories.map((c) => c.count))
    for (const c of data.categories) {
      doc.ensure(22)
      doc.label(diaryCategories[c.category].label, M, doc.y + 2, { size: 9.5, color: C.ink2 })
      const bw = ((W - 150) * c.count) / max
      doc.round(M + 110, doc.y + 1, Math.max(6, bw), 10, 5, C.sage300)
      doc.label(String(c.count), M + 116 + bw, doc.y + 2, { font: f.bold, size: 9 })
      doc.y += 20
    }
    doc.y += 10
  }

  if (data.stats.sessions > 0) {
    doc.overline('Trainingsaktivität')
    doc.text(`${data.stats.sessions} Einheiten an ${data.stats.trainingDays} Tagen · ${data.stats.activeMinutes} Minuten aktiv`, { size: 10.5, color: C.ink2 })
    doc.y += 8
    const chartH = 110
    doc.ensure(chartH + 30)
    const maxS = Math.max(1, ...data.buckets.map((b) => b.sessions))
    const slot = W / data.buckets.length
    const barW = Math.min(26, slot * 0.6)
    const base = doc.y + chartH
    doc.page.drawLine({ start: { x: M, y: doc.py(base) }, end: { x: M + W, y: doc.py(base) }, thickness: 0.5, color: C.line })
    data.buckets.forEach((b, i) => {
      const h = b.sessions ? Math.max(3, (b.sessions / maxS) * (chartH - 18)) : 0
      const x = M + i * slot + (slot - barW) / 2
      if (h) doc.rect(x, base - h, barW, h, C.sage300)
      if (b.sessions) doc.label(String(b.sessions), x + barW / 2, base - h - 12, { size: 7.5, color: C.ink3, align: 'center' })
      doc.label(b.label, x + barW / 2, base + 5, { size: 7, color: C.ink3, align: 'center' })
    })
    doc.y = base + 24
    const fb = data.feedback
    doc.text(`Deine Rückmeldungen: ${fb.good}× ${feedbackMeta.good.label.toLowerCase()} · ${fb.hard}× ${feedbackMeta.hard.label.toLowerCase()} · ${fb.issue}× Beschwerden notiert`, { size: 9, color: C.ink3 })
    doc.text('Die Auswertung zeigt Trainingsaktivität und eigene Beobachtungen – keine Aussage über den Gesundheitszustand.', { size: 8, color: C.ink3 })
    doc.y += 10
  }

  // Highlights
  if (data.highlights.length) {
    doc.newPage()
    doc.overline('Highlights')
    doc.heading('Die schönsten Momente', 22)
    for (const e of data.highlights) {
      const img = withPhotos && e.photos[0] ? await loadPhoto(doc, e.photos[0], W / 260) : null
      doc.ensure((img ? 270 : 0) + 70)
      if (img) {
        doc.image(img, M, doc.y, W, 260)
        doc.y += 272
      }
      doc.star(M, doc.y - 1, 11)
      doc.label(fmt.dateLong(e.at), M + 15, doc.y, { size: 9, color: C.ink3 })
      doc.y += 16
      doc.text(e.title, { font: f.display, size: 17, lineHeight: 22 })
      if (e.text) doc.text(e.text, { size: 10.5, color: C.ink2, lineHeight: 15.5 })
      doc.y += 18
    }
  }

  // Tagebuch
  if (data.groups.length) {
    doc.newPage()
    doc.overline('Tagebuch')
    doc.heading(period.kind === 'year' ? 'Das ganze Jahr' : 'Alle Einträge', 22)
    for (const g of data.groups) {
      doc.ensure(60)
      doc.y += 6
      doc.text(g.label, { font: f.display, size: period.kind === 'year' ? 18 : 14, color: C.sage, lineHeight: 24 })
      doc.hr(doc.y + 2)
      doc.y += 12
      for (const e of g.entries) {
        const photos = withPhotos ? e.photos.slice(0, 4) : []
        doc.ensure(52 + (photos.length ? 96 : 0))
        const cat = diaryCategories[e.category].label
        doc.label(`${cat.toUpperCase()}  ·  ${fmt.dateShort(e.at)}, ${fmt.time(e.at)} Uhr`, M, doc.y, { font: f.bold, size: 7.5, color: C.ink3 })
        if (e.highlight) doc.star(A4.w - M - 11, doc.y - 2, 11)
        doc.y += 14
        doc.text(e.title, { font: f.bold, size: 11.5, lineHeight: 16 })
        if (e.text) doc.text(e.text, { size: 10, color: C.ink2, lineHeight: 14.5 })
        if (photos.length) {
          doc.y += 6
          const gap = 8
          const pw = (W - 3 * gap) / 4
          const ph = pw * 0.75
          doc.ensure(ph)
          for (const [i, url] of photos.entries()) {
            const img = await loadPhoto(doc, url, 4 / 3, 600)
            if (img) doc.image(img, M + i * (pw + gap), doc.y, pw, ph)
          }
          doc.y += ph
        }
        doc.y += 16
      }
    }
  }

  doc.ensure(40)
  doc.y += 10
  doc.text(`Erstellt am ${created()} mit Doxie Diary`, { size: 8.5, color: C.ink3, align: 'center' })
  doc.footers(`Doxie Diary · ${title} · ${period.range}`, true)
  return doc.save()
}

// ── Bericht für Tierarzt / Physio ──────────────────────────────────────

export async function createVetPdf(o: { dog: Dog; period: Period; owner: string; data: VetReportData }): Promise<Blob> {
  const { dog, period, owner, data } = o
  const doc = await Doc.create(`Bericht ${dog.name} – Doxie Diary`)
  const f = doc.f
  doc.newPage()

  // Kopf
  doc.logo(M, M, 30)
  doc.label('Bericht für Tierarzt / Physiotherapie', M + 42, M + 2, { font: f.display, size: 18 })
  doc.label(`Zeitraum: ${period.range}  ·  erstellt am ${created()}${owner ? `  ·  von ${owner}` : ''}`, M + 42, M + 26, { size: 8.5, color: C.ink3 })
  doc.y = M + 52
  doc.hr()
  doc.y += 16

  // Patient
  doc.overline('Patient')
  const age = ageFrom(dog.birthDate)
  const rows: Array<[string, string]> = [
    ['Name', dog.name],
    ['Rasse', dog.breed || '–'],
    ['Geschlecht', `${sexLabel(dog)}${dog.neutered === true ? ', kastriert' : dog.neutered === false ? ', nicht kastriert' : ''}`],
    ['Geburtsdatum', `${fmt.dateFull(dog.birthDate)} (${age.years} Jahre, ${age.months} Monate)`],
    ['Gewicht', `${fmt.num(dog.weightKg)} kg`],
  ]
  for (const [k, v] of rows) table(doc, k, v)
  if (dog.healthNotes) table(doc, 'Hinweise', dog.healthNotes)
  doc.y += 12

  // Training
  doc.overline('Trainingsübersicht')
  const s = data.review.stats
  const quota = data.adherence.planned ? `${data.adherence.done} von ${data.adherence.planned} geplanten Einheiten (${Math.round((data.adherence.done / data.adherence.planned) * 100)} %)` : '–'
  table(doc, 'Einheiten', `${s.sessions} an ${s.trainingDays} Tagen, ${s.activeMinutes} Minuten aktiv`)
  table(doc, 'Planerfüllung', quota)
  const fb = data.review.feedback
  table(doc, 'Rückmeldungen', `${fb.good}× gut · ${fb.hard}× schwierig · ${fb.issue}× Beschwerden · ${fb.skipped}× übersprungen`)
  if (data.review.buckets.length > 1) {
    table(doc, data.review.bucketUnit === 'month' ? 'Pro Monat' : 'Pro Woche (ab)', data.review.buckets.map((b) => `${b.label}: ${b.sessions}`).join('  ·  '))
  }
  doc.y += 12

  if (data.plans.length) {
    doc.overline('Aktuelle Trainingspläne')
    for (const { plan, exercises } of data.plans) {
      doc.ensure(40)
      const days = plan.weekdays.length === 7 ? 'täglich' : plan.weekdays.map((d: Weekday) => weekdayShort[d - 1]).join(', ') || 'ohne feste Tage'
      doc.text(`${plan.name}`, { font: f.bold, size: 10.5, lineHeight: 15 })
      doc.text(`${days}${plan.timeOfDay ? `, ${plan.timeOfDay} Uhr` : ''}`, { size: 9, color: C.ink3, lineHeight: 13 })
      exercises.forEach((e, i) => doc.text(`${i + 1}. ${e.name}${e.params ? ` – ${e.params}` : ''}`, { size: 9.5, color: C.ink2, x: M + 10, width: W - 10, lineHeight: 13.5 }))
      doc.y += 8
    }
    doc.y += 4
  }

  // Beobachtungen
  if (data.hardByExercise.length) {
    doc.overline('Als „schwierig“ markiert (ohne Notiz)')
    for (const h of data.hardByExercise) table(doc, `${h.count}×`, h.exercise)
    doc.y += 12
  }
  doc.overline(`Beschwerden und Notizen aus dem Training (${data.observations.length})`)
  if (!data.observations.length) doc.text('Keine Beschwerden und keine Notizen im Zeitraum.', { size: 9.5, color: C.ink3 })
  for (const ob of data.observations) {
    doc.ensure(34)
    const fbl = ob.feedback ? feedbackMeta[ob.feedback].label : 'Notiz'
    doc.label(fmt.dateShort(ob.at), M, doc.y, { size: 9, color: C.ink3 })
    doc.label(ob.exercise, M + 62, doc.y, { font: f.bold, size: 9.5, maxWidth: 230 })
    doc.label(fbl, A4.w - M, doc.y, { font: f.bold, size: 9, color: ob.feedback === 'issue' ? C.alert : C.ink2, align: 'right' })
    doc.y += 14
    if (ob.note) doc.text(`„${ob.note}“`, { size: 9.5, color: C.ink2, x: M + 62, width: W - 62, lineHeight: 13.5 })
    doc.y += 6
  }
  if (data.sessionNotes.length) {
    doc.y += 8
    doc.overline('Notizen zu Einheiten')
    for (const n of data.sessionNotes) {
      doc.ensure(30)
      doc.label(`${fmt.dateShort(n.at)} · ${n.planName}`, M, doc.y, { size: 9, color: C.ink3 })
      doc.y += 13
      doc.text(n.note, { size: 9.5, color: C.ink2, lineHeight: 13.5 })
      doc.y += 6
    }
  }
  doc.y += 12

  // Gesundheit
  doc.overline(`Gesundheitseinträge aus dem Tagebuch (${data.healthEntries.length})`)
  if (!data.healthEntries.length) doc.text('Keine Einträge in der Kategorie Gesundheit.', { size: 9.5, color: C.ink3 })
  for (const e of data.healthEntries) {
    doc.ensure(40)
    doc.label(fmt.dateFull(e.at), M, doc.y, { size: 9, color: C.ink3 })
    doc.y += 13
    doc.text(e.title, { font: f.bold, size: 10.5, lineHeight: 15 })
    if (e.text) doc.text(e.text, { size: 9.5, color: C.ink2, lineHeight: 13.5 })
    doc.y += 8
  }

  doc.y += 14
  doc.ensure(40)
  doc.hr()
  doc.y += 8
  doc.text('Selbst dokumentierte Angaben der Halterin bzw. des Halters aus Doxie Diary. Der Bericht enthält keine medizinische Bewertung oder Empfehlung.', { size: 8, color: C.ink3, lineHeight: 11.5 })
  doc.footers(`Doxie Diary · Bericht ${dog.name} · ${period.range}`)
  return doc.save()
}

/** Zweispaltige Zeile „Bezeichnung | Wert“ mit Umbruch im Wert */
function table(doc: Doc, key: string, value: string) {
  doc.ensure(18)
  const top = doc.y
  doc.label(key, M, top, { size: 9.5, color: C.ink3 })
  doc.text(value, { x: M + 110, width: W - 110, size: 9.5, lineHeight: 13.5 })
  doc.y = Math.max(doc.y, top + 15) + 3
}

/** Auf dem Handy über das Teilen-Menü (Dateien, Mail, …), sonst als Download. */
export async function deliver(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'application/pdf' })
  const mobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent)
  if (mobile && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename.replace(/\.pdf$/, '') })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.style.display = 'none'
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000)
}
