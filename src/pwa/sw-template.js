/* Doxie Diary Service Worker – wird beim Build mit Dateiliste und Version befüllt. */
const VERSION = '__VERSION__'
const PRECACHE = __PRECACHE__
const CACHE = `doxie-shell-${VERSION}`
const scope = new URL(self.registration.scope)
const INDEX = new URL('index.html', scope).href

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE.map((p) => new URL(p, scope).href))))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('doxie-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  // Nur eigene GET-Anfragen; die API (personenbezogene Daten) wird nie gecacht
  if (req.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname) || url.pathname.includes('/api/')) return

  if (req.mode === 'navigate') {
    // Seiten: zuerst Netz (aktuelle Version), offline die gespeicherte App-Hülle
    event.respondWith(fetch(req).catch(() => caches.match(INDEX)))
    return
  }
  // Gehashte Build-Dateien, Schriften, Icons: aus dem Cache, sonst Netz.
  // Nachgeladene Build-Dateien (z. B. PDF-Baustein) beim ersten Gebrauch für offline merken.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && url.pathname.includes('/assets/')) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
