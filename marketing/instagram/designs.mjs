// Vorlagen für Feed-Posts (1080×1350), Karussell und Stories (1080×1920)

const logo = '../assets/logo.svg'
const shot = (n) => `../shots/${n}.png`

/** iPhone-Rahmen mit Statusleiste; w = Breite des Rahmens */
function phone(name, { x, y, w, rotate = 0, crop }) {
  const s = w - 32
  const bar = Math.round(s * 0.12)
  const style = `left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rotate}deg)`
  const screenH = crop ? `height:${crop}px;` : ''
  return `<div class="phone" style="${style}"><div class="screen" style="${screenH}">
    <div class="bar" style="height:${bar}px;font-size:${Math.round(s * 0.042)}px"><span>9:41</span><span style="letter-spacing:2px">●●● ▮</span></div>
    <div class="island" style="top:${Math.round(s * 0.028)}px;width:${Math.round(s * 0.31)}px;height:${Math.round(s * 0.088)}px"></div>
    <img src="${shot(name)}">
  </div></div>`
}

const brand = (x = 80, y = 80, light = false) =>
  `<div class="brand" style="left:${x}px;top:${y}px;${light ? 'color:#fbf8ef' : ''}"><img src="${logo}">Doxie Diary</div>`

const footer = (light = false, y = null) =>
  `<div class="abs url" style="left:80px;${y ? `top:${y}px` : 'bottom:72px'};font-size:28px;${light ? 'color:#fbf8ef' : ''}">doxiediary.de</div>`

export const designs = [
  // ───────────── Feed-Posts 4:5 ─────────────
  {
    name: 'post-01-launch',
    html: `<div class="c bg-warm">
      ${brand()}
      <h1 class="abs display" style="left:80px;top:200px;font-size:104px">Dein Hund.<br>Dein Alltag.<br><span class="it">Ein Ort für alles.</span></h1>
      ${phone('02-heute', { x: 560, y: 600, w: 440, rotate: 4 })}
      <div class="bubble" style="left:80px;top:690px;background:var(--sage-600);color:#fbf8ef;transform:rotate(-3deg)"><b>Lolas Physiotraining</b><span>5 Übungen · 10 Min.</span></div>
      <div class="bubble" style="left:150px;top:880px;background:var(--surface);transform:rotate(2deg)"><b>7 Tage in Folge</b><span>Schön dranbleiben</span></div>
      <div class="bubble" style="left:70px;top:1060px;background:var(--honey-100);transform:rotate(-1.5deg)"><b>Erster Ausflug an den See</b><span>Tagebuch · Erlebnis</span></div>
    </div>`,
  },
  {
    name: 'post-02-physio',
    html: `<div class="c bg-warm">
      <div class="abs eyebrow" style="left:80px;top:96px">Physiotraining</div>
      <h1 class="abs display" style="left:80px;top:150px;font-size:92px">Physio für zuhause.<br><span class="it">Schritt für Schritt.</span></h1>
      <p class="abs lead" style="left:80px;top:420px;width:460px">Übungen, Sätze und Pausen – die App zählt mit und führt euch ruhig durch jede Einheit.</p>
      <div class="abs" style="left:80px;top:700px;display:flex;flex-direction:column;gap:20px;align-items:flex-start">
        <span class="chip">Wiederholungen tippen</span>
        <span class="chip">Pausen mit sanftem Ton</span>
        <span class="chip">Notiz zu jeder Übung</span>
        <span class="chip">Klappt auch offline</span>
      </div>
      ${phone('04b-einheit-zaehler', { x: 590, y: 440, w: 430, rotate: 0 })}
      ${footer()}
    </div>`,
  },
  {
    name: 'post-03-tagebuch',
    html: `<div class="c bg-honey">
      <div class="abs eyebrow" style="left:80px;top:96px">Tagebuch</div>
      <h1 class="abs display" style="left:80px;top:150px;font-size:96px">Kleine Momente.<br><span class="it">Gut aufgehoben.</span></h1>
      <p class="abs lead" style="left:80px;top:400px;width:900px">Alltag, Gesundheit, Erlebnisse – mit Fotos, Stimmung und Stern für die schönsten Tage.</p>
      ${phone('05-tagebuch', { x: 300, y: 560, w: 480 })}
    </div>`,
  },
  {
    name: 'post-04-rueckblick',
    html: `<div class="c bg-warm">
      <div class="abs eyebrow" style="left:80px;top:96px">Rückblick</div>
      <h1 class="abs display" style="left:80px;top:150px;font-size:92px">Ein ganzer Monat.<br><span class="it">Auf einen Blick.</span></h1>
      <p class="abs lead" style="left:80px;top:420px;width:470px">Woche, Monat oder Jahr als schönes PDF – oder als kompakter Bericht für Tierarzt und Physio.</p>
      ${phone('06-rueckblick', { x: 590, y: 450, w: 420, rotate: 3 })}
      <div class="abs" style="left:80px;top:790px;width:440px;padding:40px;border-radius:30px;background:var(--surface);box-shadow:0 30px 60px -30px rgb(60 48 30 / .35);transform:rotate(-3deg)">
        <div style="font-size:22px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);font-weight:650">1.–31. Oktober</div>
        <div class="display" style="font-size:54px;margin-top:10px">Lolas Oktober</div>
        <div style="display:flex;gap:34px;margin-top:30px">
          <div><div class="num" style="font-size:56px">16</div><div style="font-size:22px;color:var(--ink-3)">Einheiten</div></div>
          <div><div class="num" style="font-size:56px">9</div><div style="font-size:22px;color:var(--ink-3)">Momente</div></div>
          <div><div class="num" style="font-size:56px">7</div><div style="font-size:22px;color:var(--ink-3)">Tage Serie</div></div>
        </div>
        <div style="margin-top:30px;height:12px;border-radius:9px;background:var(--sage-100)"><div style="width:72%;height:100%;border-radius:9px;background:var(--sage-600)"></div></div>
      </div>
      ${footer()}
    </div>`,
  },
  {
    name: 'post-05-datenschutz',
    html: `<div class="c bg-sage">
      ${brand(80, 80, true)}
      <h1 class="abs display" style="left:80px;top:300px;font-size:116px">Keine Werbung.<br>Kein Tracking.<br><span class="it">Nur ihr zwei.</span></h1>
      <p class="abs lead" style="left:80px;top:760px;width:860px">Deine Daten liegen auf einem Server in Deutschland, werden nicht verkauft und lassen sich jederzeit exportieren oder löschen.</p>
      <div class="abs" style="left:80px;top:1010px;display:flex;gap:16px;flex-wrap:wrap;width:920px">
        <span class="chip" style="background:rgb(255 255 255 / .1);color:#fbf8ef;box-shadow:none;border:2px solid rgb(255 255 255 / .2)">Server in Deutschland</span>
        <span class="chip" style="background:rgb(255 255 255 / .1);color:#fbf8ef;box-shadow:none;border:2px solid rgb(255 255 255 / .2)">Export jederzeit</span>
        <span class="chip" style="background:rgb(255 255 255 / .1);color:#fbf8ef;box-shadow:none;border:2px solid rgb(255 255 255 / .2)">Fotos ohne Standort</span>
      </div>
      ${footer(true)}
    </div>`,
  },

  // ───────────── Karussell „In 3 Schritten startklar“ ─────────────
  {
    name: 'karussell-1-cover',
    html: `<div class="c bg-warm">
      ${brand()}
      <div class="abs eyebrow" style="left:80px;top:420px">So geht's</div>
      <h1 class="abs display" style="left:80px;top:480px;font-size:128px">In 3 Schritten<br><span class="it">startklar.</span></h1>
      <p class="abs lead" style="left:80px;top:830px;width:820px">Kostenlos, im Browser, ohne App-Store – und auf dem Handy wie eine echte App.</p>
      <div class="abs chip" style="right:80px;bottom:80px">Wischen →</div>
    </div>`,
  },
  ...[
    ['1', 'Konto<br>anlegen', 'Vorname, E-Mail, Passwort – fertig. Danach kurz die E-Mail bestätigen.', '01-start'],
    ['2', 'Hund<br>anlegen', 'Name, Rasse, Alter, Gewicht und ein schönes Foto. Mehrere Hunde gehen auch.', '08-hundeprofil'],
    ['3', 'Plan<br>starten', 'Übungen aus den Vorlagen wählen oder eigene anlegen – und los geht\'s.', '03-training'],
  ].map(([n, title, text, s]) => ({
    name: `karussell-${Number(n) + 1}-schritt-${n}`,
    html: `<div class="c bg-warm">
      <div class="abs num" style="left:80px;top:60px;font-size:300px;line-height:1;color:var(--sage-200)">${n}</div>
      <h2 class="abs display" style="left:80px;top:400px;font-size:88px">${title}</h2>
      <p class="abs lead" style="left:80px;top:610px;width:440px">${text}</p>
      ${phone(s, { x: 580, y: 140, w: 430 })}
    </div>`,
  })),

  // ───────────── Stories 9:16 ─────────────
  {
    name: 'story-01-launch',
    size: 'story',
    html: `<div class="c bg-warm">
      ${brand(80, 140)}
      <div class="abs eyebrow" style="left:80px;top:300px">Neu</div>
      <h1 class="abs display" style="left:80px;top:350px;font-size:112px">Das Tagebuch<br>für deinen Hund.</h1>
      <p class="abs lead" style="left:80px;top:620px;width:900px">Physiotraining, Gesundheit und gemeinsame Momente – liebevoll festgehalten.</p>
      <div class="abs" style="left:80px;right:80px;top:790px;height:150px;border:4px dashed rgb(78 107 87 / .35);border-radius:40px;display:flex;align-items:center;justify-content:center;font-size:30px;color:var(--ink-3)">Link-Sticker hier platzieren</div>
      ${phone('02-heute', { x: 250, y: 1010, w: 580 })}
    </div>`,
  },
  {
    name: 'story-02-installieren',
    size: 'story',
    html: `<div class="c bg-warm">
      ${brand(80, 140)}
      <div class="abs eyebrow" style="left:80px;top:300px">iPhone</div>
      <h1 class="abs display" style="left:80px;top:350px;font-size:100px">Doxie Diary<br><span class="it">auf den Homescreen.</span></h1>
      ${[
        ['1', 'In Safari öffnen', 'doxiediary.de'],
        ['2', 'Auf „Teilen“ tippen', 'das Quadrat mit dem Pfeil nach oben'],
        ['3', '„Zum Home-Bildschirm“', 'und „Hinzufügen“ bestätigen'],
      ].map(([n, t, s], i) => `
        <div class="abs" style="left:80px;right:80px;top:${700 + i * 250}px;display:flex;gap:40px;align-items:center;padding:44px;border-radius:40px;background:var(--surface);box-shadow:0 30px 60px -36px rgb(60 48 30 / .35)">
          <div class="num" style="flex:none;width:110px;height:110px;border-radius:50%;background:var(--sage-600);color:#fbf8ef;display:flex;align-items:center;justify-content:center;font-size:60px">${n}</div>
          <div><div style="font-size:42px;font-weight:650">${t}</div><div style="font-size:30px;color:var(--ink-3);margin-top:6px">${s}</div></div>
        </div>`).join('')}
      <p class="abs lead" style="left:80px;top:1480px;width:920px">Startet dann wie eine App, im Vollbild und auch offline. Android: Chrome-Menü → „App installieren“.</p>
    </div>`,
  },
  {
    name: 'story-03-umfrage',
    size: 'story',
    html: `<div class="c bg-honey">
      ${brand(80, 140)}
      <div class="abs eyebrow" style="left:80px;top:520px">Kurze Frage</div>
      <h1 class="abs display" style="left:80px;top:580px;font-size:118px">Macht ihr<br>Physio-Übungen<br><span class="it">zuhause?</span></h1>
      <div class="abs" style="left:80px;right:80px;top:1060px;height:300px;border:4px dashed rgb(78 107 87 / .35);border-radius:40px;display:flex;align-items:center;justify-content:center;font-size:30px;color:var(--ink-3)">Umfrage-Sticker hier platzieren</div>
      <div class="abs" style="right:-260px;bottom:-260px;width:820px;height:820px;border-radius:50%;border:3px solid rgb(78 107 87 / .16);box-shadow:0 0 0 90px rgb(78 107 87 / .05), 0 0 0 180px rgb(78 107 87 / .03)"></div>
      <div class="abs url" style="left:80px;bottom:150px;font-size:30px">doxiediary.de</div>
    </div>`,
  },
  {
    name: 'story-04-zaehlen',
    size: 'story',
    html: `<div class="c bg-sage">
      ${brand(80, 140, true)}
      <h1 class="abs display" style="left:80px;top:320px;font-size:112px">Tippen.<br>Zählen.<br><span class="it">Durchatmen.</span></h1>
      <p class="abs lead" style="left:80px;top:720px;width:900px">Du konzentrierst dich auf deinen Hund – die App merkt sich Wiederholungen, Sätze und Pausen.</p>
      ${phone('04b-einheit-zaehler', { x: 250, y: 940, w: 580 })}
    </div>`,
  },
  {
    name: 'story-05-frage',
    size: 'story',
    html: `<div class="c bg-warm">
      ${brand(80, 140)}
      <div class="abs eyebrow" style="left:80px;top:520px">Wir bauen weiter</div>
      <h1 class="abs display" style="left:80px;top:580px;font-size:110px">Was soll<br>Doxie Diary als<br><span class="it">Nächstes können?</span></h1>
      <div class="abs" style="left:80px;right:80px;top:1060px;height:340px;border:4px dashed rgb(78 107 87 / .35);border-radius:40px;display:flex;align-items:center;justify-content:center;font-size:30px;color:var(--ink-3)">Fragen-Sticker hier platzieren</div>
      <div class="abs" style="right:-260px;bottom:-260px;width:820px;height:820px;border-radius:50%;border:3px solid rgb(78 107 87 / .16);box-shadow:0 0 0 90px rgb(78 107 87 / .05), 0 0 0 180px rgb(78 107 87 / .03)"></div>
      <div class="abs url" style="left:80px;bottom:150px;font-size:30px">doxiediary.de</div>
    </div>`,
  },

  // ───────────── Profilbild ─────────────
  {
    name: 'profilbild',
    size: 'square',
    html: `<div class="c" style="background:#687F69;display:flex;align-items:center;justify-content:center">
      <img src="${logo}" style="width:1080px;height:1080px;transform:scale(1.25)">
    </div>`,
  },
]
