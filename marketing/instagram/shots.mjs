// App-Screenshots aus der Vorschau-Version (npm run build:preview, vite preview --outDir dist-showcase --port 4180)
// Aufruf: node marketing/instagram/shots.mjs marketing/instagram/shots
import { chromium } from 'playwright'
const out = process.argv[2]
const base = 'http://localhost:4180/#'
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage()
const settle = () => p.waitForTimeout(900)

await p.goto(base + '/welcome'); await settle()
const demo = p.getByText(/Beispieldaten/).first()
// Demo-Link erscheint nur in der Vorschau – auf dem Screenshot ausblenden
await demo.evaluate((el) => { el.style.visibility = 'hidden' })
await p.screenshot({ path: `${out}/01-start.png` })
await demo.evaluate((el) => { el.style.visibility = '' })
await demo.click(); await settle()

const pages = [['02-heute', '/'], ['03-training', '/training'], ['05-tagebuch', '/diary'], ['06-rueckblick', '/review'],
  ['07-verlauf', '/training/history'], ['08-hundeprofil', '/dog'], ['09-uebungen', '/training/exercises']]
for (const [name, route] of pages) {
  await p.goto(base + route); await settle()
  await p.screenshot({ path: `${out}/${name}.png` })
}

await p.goto(base + '/training/session/p1'); await settle()
await p.screenshot({ path: `${out}/04a-einheit-start.png` })
await p.getByRole('button').filter({ hasText: /Los geht/ }).first().click(); await settle()
for (let i = 0; i < 5; i++) { await p.mouse.click(195, 470); await p.waitForTimeout(250) }
await p.waitForTimeout(1500)
await p.screenshot({ path: `${out}/04b-einheit-zaehler.png` })
await b.close()
