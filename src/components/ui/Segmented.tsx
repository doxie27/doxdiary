import { cn } from '../../lib/cn'

interface Props<T extends string> {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  className?: string
}

export function Segmented<T extends string>({ value, options, onChange, className }: Props<T>) {
  const idx = options.findIndex((o) => o.value === value)
  return (
    <div role="tablist" className={cn('relative grid rounded-2xl bg-sunken p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-xl bg-surface shadow-card transition-transform duration-300 ease-[var(--ease-out-soft)]"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn('relative z-10 h-10 rounded-xl text-sm font-semibold transition-colors', o.value === value ? 'text-ink' : 'text-ink-3')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
