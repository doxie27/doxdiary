import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from 'pdf-lib'
import frauncesItalicUrl from './fonts/Fraunces-Italic.ttf?url'
import frauncesUrl from './fonts/Fraunces-Medium.ttf?url'
import jakartaBoldUrl from './fonts/PlusJakartaSans-SemiBold.ttf?url'
import jakartaUrl from './fonts/PlusJakartaSans-Regular.ttf?url'

/**
 * Kleiner Satz-Helfer über pdf-lib: A4, Ränder, Zeilen- und Seitenumbruch,
 * Bilder (auf dem Gerät verkleinert), Logo als Vektor, Fußzeile mit Seitenzahl.
 */

export const A4 = { w: 595.28, h: 841.89 }
export const M = 48 // Rand
export const W = A4.w - 2 * M // Satzbreite

const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
export const C = {
  ink: hex('#1E2420'),
  ink2: hex('#4A514B'),
  ink3: hex('#7B8079'),
  line: hex('#E7E0D3'),
  canvas: hex('#F6F2EA'),
  sunken: hex('#EFE9DE'),
  sage: hex('#4E6B57'),
  sage300: hex('#A6BB9E'),
  sage100: hex('#E3EADF'),
  brand: hex('#687F69'),
  cream: hex('#FBF8EF'),
  honey: hex('#E2B866'),
  honey100: hex('#F8ECD2'),
  clay100: hex('#F5E3D8'),
  alert: hex('#B2533B'),
  white: rgb(1, 1, 1),
}

export interface Fonts {
  display: PDFFont
  italic: PDFFont
  sans: PDFFont
  bold: PDFFont
}

type TextOpts = { font?: PDFFont; size?: number; color?: RGB; x?: number; width?: number; lineHeight?: number; align?: 'left' | 'center' | 'right' }

export class Doc {
  page!: PDFPage
  /** Abstand vom oberen Seitenrand (wächst nach unten) */
  y = M
  readonly bottom = A4.h - M - 26 // Platz für Fußzeile
  private glyphs = new Map<PDFFont, Set<number>>()

  readonly pdf: PDFDocument
  readonly f: Fonts

  private constructor(pdf: PDFDocument, f: Fonts) {
    this.pdf = pdf
    this.f = f
  }

  static async create(title: string): Promise<Doc> {
    const pdf = await PDFDocument.create()
    pdf.registerFontkit(fontkit)
    pdf.setTitle(title)
    pdf.setCreator('Doxie Diary')
    pdf.setProducer('Doxie Diary')
    pdf.setLanguage('de-DE')
    const load = async (url: string) => pdf.embedFont(await (await fetch(url)).arrayBuffer(), { subset: true })
    const [display, italic, sans, bold] = await Promise.all([load(frauncesUrl), load(frauncesItalicUrl), load(jakartaUrl), load(jakartaBoldUrl)])
    return new Doc(pdf, { display, italic, sans, bold })
  }

  newPage(background?: RGB) {
    this.page = this.pdf.addPage([A4.w, A4.h])
    if (background) this.page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: background })
    this.y = M
  }

  /** Neue Seite, falls nicht mehr genug Platz ist. */
  ensure(height: number) {
    if (this.y + height > this.bottom) this.newPage()
  }

  /** PDF-Koordinate (unten links) aus Abstand von oben */
  py(top: number) {
    return A4.h - top
  }

  /** Entfernt Zeichen, die die Schrift nicht enthält (z. B. Emojis). */
  clean(text: string, font: PDFFont): string {
    let set = this.glyphs.get(font)
    if (!set) {
      set = new Set(font.getCharacterSet())
      this.glyphs.set(font, set)
    }
    return [...text.replace(/\r\n?/g, '\n').replace(/\t/g, ' ')].filter((ch) => ch === '\n' || set!.has(ch.codePointAt(0)!)).join('')
  }

  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const out: string[] = []
    for (const para of this.clean(text, font).split('\n')) {
      const words = para.split(/ +/)
      let line = ''
      for (const word of words) {
        const test = line ? `${line} ${word}` : word
        if (font.widthOfTextAtSize(test, size) <= width) {
          line = test
          continue
        }
        if (line) out.push(line)
        // Sehr lange Wörter hart umbrechen
        let rest = word
        while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
          let i = rest.length - 1
          while (i > 1 && font.widthOfTextAtSize(rest.slice(0, i), size) > width) i--
          out.push(rest.slice(0, i))
          rest = rest.slice(i)
        }
        line = rest
      }
      out.push(line)
    }
    return out
  }

  /** Fließtext mit Umbruch; bricht bei Bedarf zeilenweise auf die nächste Seite um. */
  text(text: string, o: TextOpts = {}): number {
    const font = o.font ?? this.f.sans
    const size = o.size ?? 10.5
    const lh = o.lineHeight ?? size * 1.45
    const x = o.x ?? M
    const width = o.width ?? W
    const start = this.y
    for (const line of this.wrap(text, font, size, width)) {
      this.ensure(lh)
      const w = font.widthOfTextAtSize(line, size)
      const dx = o.align === 'center' ? (width - w) / 2 : o.align === 'right' ? width - w : 0
      this.page.drawText(line, { x: x + dx, y: this.py(this.y + size), size, font, color: o.color ?? C.ink })
      this.y += lh
    }
    return this.y - start
  }

  /** Einzelne Zeile ohne Umbruch an fester Position (kürzt mit „…“). */
  label(text: string, x: number, top: number, o: { font?: PDFFont; size?: number; color?: RGB; maxWidth?: number; align?: 'left' | 'center' | 'right' } = {}) {
    const font = o.font ?? this.f.sans
    const size = o.size ?? 9
    let t = this.clean(text, font).replace(/\n/g, ' ')
    if (o.maxWidth) while (t.length > 1 && font.widthOfTextAtSize(t, size) > o.maxWidth) t = t.slice(0, -2) + '…'
    const w = font.widthOfTextAtSize(t, size)
    const dx = o.align === 'center' ? -w / 2 : o.align === 'right' ? -w : 0
    this.page.drawText(t, { x: x + dx, y: this.py(top + size), size, font, color: o.color ?? C.ink })
  }

  rect(x: number, top: number, width: number, height: number, color: RGB, border?: RGB) {
    this.page.drawRectangle({ x, y: this.py(top + height), width, height, color, borderColor: border, borderWidth: border ? 0.75 : 0 })
  }

  /** Abgerundetes Rechteck über einen SVG-Pfad */
  round(x: number, top: number, width: number, height: number, r: number, color: RGB, border?: RGB) {
    const p = `M${r} 0H${width - r}Q${width} 0 ${width} ${r}V${height - r}Q${width} ${height} ${width - r} ${height}H${r}Q0 ${height} 0 ${height - r}V${r}Q0 0 ${r} 0Z`
    this.page.drawSvgPath(p, { x, y: this.py(top), color, borderColor: border, borderWidth: border ? 0.75 : 0 })
  }

  hr(top = this.y, color = C.line) {
    this.page.drawLine({ start: { x: M, y: this.py(top) }, end: { x: A4.w - M, y: this.py(top) }, thickness: 0.75, color })
  }

  /** Abschnittsüberschrift mit etwas Luft davor */
  heading(text: string, size = 20) {
    this.ensure(size + 40)
    this.y += 8
    this.text(text, { font: this.f.display, size, lineHeight: size * 1.25 })
    this.y += 6
  }

  /** Overline (Versalien, gesperrt) */
  overline(text: string, color = C.ink3) {
    // Überschrift nie allein am Seitenende: Platz für mindestens zwei Folgezeilen
    this.ensure(56)
    const t = this.clean(text.toUpperCase(), this.f.bold)
    let x = M
    for (const ch of t) {
      this.page.drawText(ch, { x, y: this.py(this.y + 8), size: 8, font: this.f.bold, color })
      x += this.f.bold.widthOfTextAtSize(ch, 8) + 0.9
    }
    this.y += 16
  }

  image(img: PDFImage, x: number, top: number, width: number, height: number) {
    this.page.drawImage(img, { x, y: this.py(top + height), width, height })
  }

  /** Doxie-Diary-Zeichen (Vektor) */
  logo(x: number, top: number, size: number) {
    const s = size / 100
    const pt = (path: string, color: RGB) => this.page.drawSvgPath(path, { x, y: this.py(top), scale: s, color })
    pt('M23 0H77Q100 0 100 23V77Q100 100 77 100H23Q0 100 0 77V23Q0 0 23 0Z', C.brand)
    pt('M45 42.5a19 19 0 1 0 0 38a19 19 0 1 0 0-38Zm1.5 8.6a10.4 10.4 0 1 1 0 20.8a10.4 10.4 0 1 1 0-20.8Z', C.cream)
    pt('M56.2 79.5V29.5C56.2 21.5 60 16.2 65 16.2C69.6 16.2 72.3 18.8 74.9 22.4L82.4 25.3C85.8 26.7 86.6 30.8 85 34C83.5 37 80.2 38.3 76.6 38.1H66V79.5C66 80.8 65.2 81.6 64 81.6H58.3C57 81.6 56.2 80.8 56.2 79.5Z', C.cream)
    pt('M27.4 61.2C21.6 59.9 17.6 55.2 17.2 49.3C17 46.9 20.3 46.4 20.9 48.6C22.1 52.8 25.4 55.6 29.6 56.2Z', C.cream)
    this.page.drawSvgPath('M63.4 24.3C65.1 29.9 66.4 34.1 70.1 37.4', { x, y: this.py(top), scale: s, borderColor: C.brand, borderWidth: 1.5 })
    this.page.drawCircle({ x: x + 71.3 * s, y: this.py(top + 26.2 * s), size: 1.4 * s, color: hex('#2E3A30') })
  }

  star(x: number, top: number, size: number, color = C.honey) {
    const s = size / 24
    this.page.drawSvgPath('M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6Z', { x, y: this.py(top), scale: s, color })
  }

  /** Fußzeile auf allen Seiten (außer optional der ersten) */
  footers(text: string, skipFirst = false) {
    const pages = this.pdf.getPages()
    pages.forEach((p, i) => {
      if (skipFirst && i === 0) return
      const y = 30
      p.drawLine({ start: { x: M, y: y + 14 }, end: { x: A4.w - M, y: y + 14 }, thickness: 0.5, color: C.line })
      const t = this.clean(text, this.f.sans)
      p.drawText(t, { x: M, y, size: 7.5, font: this.f.sans, color: C.ink3 })
      const n = `Seite ${i + 1} von ${pages.length}`
      p.drawText(n, { x: A4.w - M - this.f.sans.widthOfTextAtSize(n, 7.5), y, size: 7.5, font: this.f.sans, color: C.ink3 })
    })
  }

  async save(): Promise<Blob> {
    const bytes = await this.pdf.save()
    return new Blob([bytes as BlobPart], { type: 'application/pdf' })
  }
}

/**
 * Lädt ein Foto, schneidet es auf das Seitenverhältnis zu („cover“) und
 * verkleinert es als JPEG – hält das PDF klein.
 */
export async function loadPhoto(doc: Doc, url: string, aspect: number, maxW = 1100): Promise<PDFImage | null> {
  try {
    const blob = await (await fetch(url, { credentials: 'same-origin' })).blob()
    const bmp = await createImageBitmap(blob)
    let sw = bmp.width
    let sh = bmp.height
    if (sw / sh > aspect) sw = sh * aspect
    else sh = sw / aspect
    const sx = (bmp.width - sw) / 2
    const sy = (bmp.height - sh) / 2
    const w = Math.min(maxW, Math.round(sw))
    const h = Math.round(w / aspect)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h)
    bmp.close()
    const jpeg = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Bild'))), 'image/jpeg', 0.8))
    return await doc.pdf.embedJpg(await jpeg.arrayBuffer())
  } catch {
    return null
  }
}
