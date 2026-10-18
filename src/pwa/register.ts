/**
 * Service-Worker-Registrierung und Installationshinweise.
 * Nicht im Entwicklungsmodus und nicht in der Vorschau (Hash-Routing).
 */

type Listener = () => void
let waiting: ServiceWorker | null = null
let installPrompt: (Event & { prompt: () => Promise<void> }) | null = null
const listeners = new Set<Listener>()
const notify = () => listeners.forEach((l) => l())

export const pwa = {
  updateReady: () => waiting !== null,
  canInstall: () => installPrompt !== null,
  isStandalone: () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
  isIos: () => /iphone|ipad|ipod/i.test(navigator.userAgent),
  subscribe(l: Listener) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  /** Neue Version aktivieren und neu laden */
  applyUpdate() {
    if (!waiting) return
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
    waiting.postMessage('SKIP_WAITING')
  },
  async install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    installPrompt = null
    notify()
  },
}

export function registerServiceWorker() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installPrompt = e as typeof installPrompt
    notify()
  })
  if (!import.meta.env.PROD || import.meta.env.VITE_ROUTER === 'hash' || !('serviceWorker' in navigator)) return
  const base = import.meta.env.BASE_URL
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .then((reg) => {
        const track = (sw: ServiceWorker | null) => {
          sw?.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              waiting = sw
              notify()
            }
          })
        }
        if (reg.waiting && navigator.serviceWorker.controller) {
          waiting = reg.waiting
          notify()
        }
        reg.addEventListener('updatefound', () => track(reg.installing))
        // Bei längerer Nutzung regelmäßig nach Updates schauen
        setInterval(() => reg.update().catch(() => null), 60 * 60 * 1000)
      })
      .catch(() => null)
  })
}
