import { chromium } from 'playwright'
const out = process.argv[2]
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage()
await p.goto('http://localhost:4180/#/welcome'); await p.waitForTimeout(500)
await p.getByText(/Beispieldaten/).first().click(); await p.waitForTimeout(500)
await p.goto('http://localhost:4180/#/training/session/p1'); await p.waitForTimeout(1200)
await p.screenshot({ path: `${out}/s-session.png` })
await p.getByRole('button').filter({ hasText: /Los geht/ }).first().click(); await p.waitForTimeout(800)
for (let i = 0; i < 5; i++) { await p.mouse.click(195, 470); await p.waitForTimeout(250) }
await p.waitForTimeout(1500)
await p.screenshot({ path: `${out}/s-session2.png` })
await b.close()
