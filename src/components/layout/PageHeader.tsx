import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconButton } from '../ui'

interface Props {
  title: string
  eyebrow?: string
  back?: string | true
  actions?: ReactNode
}

export function PageHeader({ title, eyebrow, back, actions }: Props) {
  const navigate = useNavigate()
  return (
    <header className="px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-8 lg:pt-10">
      {(back || actions) && (
        <div className="mb-4 flex items-center justify-between">
          {back ? (
            <IconButton icon={ChevronLeft} label="Zurück" onClick={() => (back === true ? navigate(-1) : navigate(back))} className="-ml-1" />
          ) : (
            <span />
          )}
          <div className="flex gap-2">{actions}</div>
        </div>
      )}
      {eyebrow && <p className="mb-1 text-sm font-semibold text-ink-3">{eyebrow}</p>}
      <h1 className="font-display text-[2rem] leading-[1.1] font-medium lg:text-[2.5rem]">{title}</h1>
    </header>
  )
}
