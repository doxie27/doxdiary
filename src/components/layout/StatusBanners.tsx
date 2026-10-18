import { RefreshCw, WifiOff } from 'lucide-react'
import { pwa } from '../../pwa/register'
import { useOnline, usePwa } from '../../pwa/usePwa'
import { useStore } from '../../store/AppStore'

/** Hinweise zu Offline-Zustand und verfügbaren Updates – schlicht, oben über dem Inhalt. */
export function StatusBanners() {
  const online = useOnline()
  const { updateReady } = usePwa()
  const { state } = useStore()
  return (
    <>
      {!online && state.mode === 'live' && (
        <div role="status" className="mx-5 mt-[max(1rem,env(safe-area-inset-top))] flex animate-rise items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white lg:mx-8 lg:mt-6">
          <WifiOff className="size-4 shrink-0 text-sage-300" />
          <span>Offline – Trainings werden gespeichert und übertragen, sobald du wieder online bist.</span>
        </div>
      )}
      {updateReady && (
        <div role="status" className="mx-5 mt-[max(1rem,env(safe-area-inset-top))] flex animate-rise items-center gap-3 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm lg:mx-8 lg:mt-6">
          <RefreshCw className="size-4 shrink-0 text-sage-600" />
          <span className="flex-1">Eine neue Version von Doxie Diary ist verfügbar.</span>
          <button onClick={() => pwa.applyUpdate()} className="font-semibold text-sage-700 underline underline-offset-2">Neu laden</button>
        </div>
      )}
    </>
  )
}
