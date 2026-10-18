import { useLegal } from '../../api/useLegal'
import { cn } from '../../lib/cn'

export function LegalLinks({ className }: { className?: string }) {
  const { imprintUrl, privacyUrl } = useLegal()
  if (!imprintUrl && !privacyUrl) return null
  return (
    <p className={cn('flex justify-center gap-4 text-xs font-medium text-ink-3', className)}>
      {imprintUrl && <a href={imprintUrl} target="_blank" rel="noopener" className="hover:text-ink-2">Impressum</a>}
      {privacyUrl && <a href={privacyUrl} target="_blank" rel="noopener" className="hover:text-ink-2">Datenschutz</a>}
    </p>
  )
}
