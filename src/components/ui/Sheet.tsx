import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/** Bottom Sheet auf dem Smartphone, zentrierter Dialog ab Tablet. */
export function Sheet({ open, onClose, title, children, footer }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full animate-sheet flex-col rounded-t-[2rem] bg-canvas shadow-float outline-none sm:max-w-lg sm:animate-rise sm:rounded-[2rem]"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" />
        <div className="flex items-center justify-between px-6 pb-2 pt-3 sm:pt-6">
          <h2 className="font-display text-2xl">{title}</h2>
          <IconButton icon={X} label="Schließen" variant="ghost" onClick={onClose} className="-mr-2" />
        </div>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <div className="border-t border-line px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
