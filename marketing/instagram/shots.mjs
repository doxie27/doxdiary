import { chromium } from 'playwright'
const out = process.argv[2]
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })
const p = await ctx.newPage()
await p.goto('http://localhost:4180/#/welcome')
await p.waitForTimeout(800)
await p.screenshot({ path: `${out}/s-welcome.png` })
await p.getByText(/Beispieldaten/).first().click()
await p.waitForTimeout(800)
for (const [n, r] of [['home','/'],['training','/training'],['diary','/diary'],['review','/review'],['history','/training/history'],['dog','/dog'],['exercises','/training/exercises']]) {
  await p.goto('http://localhost:4180/#' + r); await p.waitForTimeout(900)
  await p.screenshot({ path: `${out}/s-${n}.png` })
}
// session screen: first plan
await p.goto('http://localhost:4180/#/training'); await p.waitForTimeout(600)
const links = await p.$$eval('a[href*="plans/"]', as => as.map(a => a.getAttribute('href')))
console.log(links)
await b.close()
