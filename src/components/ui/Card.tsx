import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card border border-line/70 bg-surface shadow-card', className)} {...rest} />
}

export function SectionHeader({ title, action, to }: { title: string; action?: string; to?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">{title}</h2>
      {action && to && (
        <Link to={to} className="-my-2 flex items-center gap-0.5 py-2 text-sm font-semibold text-sage-600 hover:text-sage-700">
          {action}
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  )
}

export function Chip({ children, className, icon }: { children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', className ?? 'bg-sunken text-ink-2')}>
      {icon}
      {children}
    </span>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-strong px-6 py-10 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-sage-100 text-sage-600">{icon}</div>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-ink-3">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
