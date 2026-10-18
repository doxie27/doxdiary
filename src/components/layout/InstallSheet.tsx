import { Share, SquarePlus } from 'lucide-react'
import { pwa } from '../../pwa/register'
import { usePwa } from '../../pwa/usePwa'
import { Button, LogoMark, Sheet } from '../ui'

/** Anleitung „Zum Startbildschirm hinzufügen“ – mit Direkt-Button, wo der Browser es erlaubt. */
export function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { canInstall, ios } = usePwa()
  return (
    <Sheet open={open} onClose={onClose} title="Als App installieren">
      <div className="flex items-center gap-4">
        <LogoMark className="size-16 rounded-[1.1rem] shadow-card" />
        <p className="text-ink-2">Doxie Diary startet dann wie eine App vom Startbildschirm – im Vollbild und ohne Browserleiste.</p>
      </div>
      {canInstall ? (
        <Button block className="mt-6" onClick={async () => { await pwa.install(); onClose() }}>Jetzt installieren</Button>
      ) : ios ? (
        <ol className="mt-6 grid grid-cols-1 gap-3 text-ink-2">
          <li className="flex items-center gap-3 rounded-2xl bg-sunken/70 p-4"><Share className="size-5 shrink-0 text-sky-600" /> Unten in Safari auf <span className="font-semibold">Teilen</span> tippen</li>
          <li className="flex items-center gap-3 rounded-2xl bg-sunken/70 p-4"><SquarePlus className="size-5 shrink-0 text-sky-600" /> <span><span className="font-semibold">Zum Home-Bildschirm</span> wählen und bestätigen</span></li>
        </ol>
      ) : (
        <ol className="mt-6 grid grid-cols-1 gap-3 text-ink-2">
          <li className="rounded-2xl bg-sunken/70 p-4">Im Browser-Menü (⋮) <span className="font-semibold">„App installieren“</span> oder <span className="font-semibold">„Zum Startbildschirm hinzufügen“</span> wählen.</li>
        </ol>
      )}
    </Sheet>
  )
}
