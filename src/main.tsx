import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker } from './pwa/register'

registerServiceWorker()

/**
 * iOS Safari zoomt beim Fokus auf Eingabefelder hinein und behält den Zoom bei –
 * die App wirkt dann seitlich verschoben. maximum-scale=1 verhindert nur dieses
 * Auto-Zoomen; Zwei-Finger-Zoom bleibt auf iOS erhalten. Android bleibt unverändert.
 */
if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
