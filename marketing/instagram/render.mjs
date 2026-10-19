// Instagram-Grafiken für Doxie Diary: HTML-Vorlagen → PNG (Playwright)
// Voraussetzung: Screenshots in shots/ (siehe shots.mjs)
// Aufruf: node marketing/instagram/render.mjs [name …]
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { designs } from './designs.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const build = join(here, 'build')
const out = join(here, 'out')
mkdirSync(build, { recursive: true })
mkdirSync(out, { recursive: true })

const only = process.argv.slice(2)
const browser = await chromium.launch()
for (const d of designs.filter((d) => !only.length || only.includes(d.name))) {
  const [w, h] = d.size === 'story' ? [1080, 1920] : d.size === 'square' ? [1080, 1080] : [1080, 1350]
  const file = join(build, `${d.name}.html`)
  writeFileSync(file, page(w, h, d.html))
  const p = await browser.newPage({ viewport: { width: w, height: h } })
  await p.goto('file://' + file)
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(200)
  await p.screenshot({ path: join(out, `${d.name}.png`) })
  await p.close()
  console.log('✔', d.name)
}
await browser.close()

function page(w, h, body) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
@font-face { font-family: Fraunces; src: url(../assets/fraunces.woff2); font-weight: 100 900; }
@font-face { font-family: Fraunces; src: url(../assets/fraunces-italic.woff2); font-weight: 100 900; font-style: italic; }
@font-face { font-family: Jakarta; src: url(../assets/jakarta.woff2); font-weight: 200 800; }
:root {
  --canvas: #f6f2ea; --surface: #fffdf9; --sunken: #efe9de; --line: #e7e0d3;
  --ink: #1e2420; --ink-2: #4a514b; --ink-3: #7b8079;
  --sage-50: #f1f4ef; --sage-100: #e3eadf; --sage-200: #c9d6c3; --sage-300: #a6bb9e; --sage-600: #4e6b57; --sage-700: #3d5545; --sage-800: #2e4035;
  --honey-100: #f8ecd2; --honey-400: #e2b866; --clay-100: #f5e3d8; --clay-400: #d08a62;
}
* { box-sizing: border-box; margin: 0; }
body { width: ${w}px; height: ${h}px; overflow: hidden; font-family: Jakarta, sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; }
.c { position: relative; width: ${w}px; height: ${h}px; overflow: hidden; background: var(--canvas); }
.bg-warm { background:
  radial-gradient(900px 700px at 100% 0%, #f8ecd2 0%, transparent 60%),
  radial-gradient(800px 800px at 0% 70%, #e3eadf 0%, transparent 60%), var(--canvas); }
.bg-sage { background: radial-gradient(900px 900px at 85% 10%, #4e6b57 0%, transparent 70%), var(--sage-800); color: #fbf8ef; }
.bg-honey { background: radial-gradient(900px 800px at 10% 0%, #fdf6e7 0%, transparent 65%), var(--honey-100); }
.display { font-family: Fraunces, serif; font-weight: 500; letter-spacing: -0.015em; line-height: 1.02; }
.it { font-style: italic; color: var(--sage-600); }
.bg-sage .it { color: var(--sage-200); }
.brand { position: absolute; display: flex; align-items: center; gap: 18px; font-family: Fraunces, serif; font-weight: 500; font-size: 38px; }
.brand img { width: 64px; height: 64px; }
.eyebrow { font-weight: 650; font-size: 26px; letter-spacing: .14em; text-transform: uppercase; color: var(--sage-600); }
.bg-sage .eyebrow { color: var(--sage-200); }
.lead { font-size: 34px; line-height: 1.45; color: var(--ink-2); }
.bg-sage .lead { color: #dfe7da; }
.abs { position: absolute; }
.chip { display: inline-flex; align-items: center; gap: 12px; padding: 16px 26px; border-radius: 999px; background: var(--surface); box-shadow: 0 2px 6px rgb(60 48 30 / .06), 0 16px 32px -16px rgb(60 48 30 / .25); font-size: 28px; font-weight: 600; color: var(--ink); }
.bubble { position: absolute; padding: 26px 32px; border-radius: 34px; box-shadow: 0 2px 6px rgb(60 48 30 / .06), 0 24px 48px -20px rgb(60 48 30 / .30); }
.bubble b { display: block; font-size: 30px; font-weight: 650; }
.bubble span { display: block; margin-top: 6px; font-size: 25px; opacity: .75; }
.phone { position: absolute; padding: 16px; border-radius: 86px; background: #1b201d; box-shadow: inset 0 0 0 3px #3b423d, 0 50px 90px -40px rgb(40 32 20 / .55), 0 20px 40px -20px rgb(40 32 20 / .3); }
.phone .screen { position: relative; overflow: hidden; border-radius: 70px; background: var(--canvas); }
.phone .bar { display: flex; justify-content: space-between; align-items: center; padding: 0 9% 0 11%; font-weight: 650; color: var(--ink); }
.phone .island { position: absolute; left: 50%; transform: translateX(-50%); background: #0d0f0e; border-radius: 99px; }
.phone img { display: block; width: 100%; }
.url { font-weight: 650; color: var(--sage-700); }
.bg-sage .url { color: #fbf8ef; }
.num { font-family: Fraunces, serif; font-weight: 500; }
</style></head><body>${body}</body></html>`
}
