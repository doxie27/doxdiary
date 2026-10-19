// Logo-Dateien als PNG erzeugen: node marketing/logo/render-logo.mjs
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(join(here, 'doxie-diary-icon.svg'), 'utf8')
const font = (f) => `url(file://${join(here, '../instagram/assets', f)})`
const css = `@font-face{font-family:Fraunces;src:${font('fraunces.woff2')};font-weight:100 900}
*{margin:0}html,body{background:transparent}
.w{display:inline-flex;align-items:center;gap:56px;padding:40px;font:500 180px/1 Fraunces,serif;letter-spacing:-.01em;white-space:nowrap}
.w svg{width:240px;height:240px}`

const files = [
  ['doxie-diary-icon-1024.png', `<div style="width:1024px;height:1024px">${svg.replace('<svg', '<svg width="1024" height="1024"')}</div>`],
  ['doxie-diary-icon-512.png', `<div style="width:512px;height:512px">${svg.replace('<svg', '<svg width="512" height="512"')}</div>`],
  ['doxie-diary-logo-dunkel.png', `<div class="w" style="color:#1e2420">${svg}Doxie Diary</div>`],
  ['doxie-diary-logo-hell.png', `<div class="w" style="color:#fbf8ef">${svg}Doxie Diary</div>`],
]
const b = await chromium.launch()
for (const [name, body] of files) {
  const p = await b.newPage({ viewport: { width: 2000, height: 1200 } })
  // Als Datei laden, damit die lokale Schrift (file://) verwendet werden darf
  const file = join(mkdtempSync(join(tmpdir(), 'logo-')), 'logo.html')
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>${css}</style>${body}`)
  await p.goto('file://' + file)
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(200)
  await (await p.$('body > *')).screenshot({ path: join(here, name), omitBackground: true })
  await p.close()
}
await b.close()
