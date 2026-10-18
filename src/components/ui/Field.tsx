import { Minus, Plus } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '../../lib/cn'

const control =
  'w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink placeholder:text-ink-3/70 transition focus:border-sage-400 focus:outline-none focus:ring-4 focus:ring-sage-100'

function Label({ htmlFor, label, hint }: { htmlFor: string; label: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between px-1 text-sm font-semibold text-ink-2">
      {label}
      {hint && <span className="text-xs font-medium text-ink-3">{hint}</span>}
    </label>
  )
}

export function TextField({ label, hint, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} hint={hint} />
      <input id={id} className={cn(control, 'h-12')} {...rest} />
    </div>
  )
}

export function TextArea({ label, hint, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} hint={hint} />
      <textarea id={id} rows={3} className={cn(control, 'resize-none py-3 leading-relaxed')} {...rest} />
    </div>
  )
}

export function Select({ label, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const id = useId()
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} />
      <select id={id} className={cn(control, 'h-12 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%237b8079%27 stroke-width=%272%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] bg-[right_1rem_center] bg-no-repeat pr-10')} {...rest}>
        {children}
      </select>
    </div>
  )
}

/** Zahlenwert mit großen +/- Touch-Flächen statt kleinem Number-Input. */
export function Stepper({ label, value, onChange, min = 0, max = 999, step = 1, unit }: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}) {
  const v = value ?? 0
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-surface py-1.5 pl-4 pr-1.5">
      <span className="text-sm font-semibold text-ink-2">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`${label} verringern`} onClick={() => onChange(v - step < min ? null : v - step)} className="flex size-9 items-center justify-center rounded-xl bg-sunken text-ink-2 active:scale-90">
          <Minus className="size-4" />
        </button>
        <span className="w-16 text-center text-[15px] font-semibold tabular-nums">
          {value === null ? '–' : value}
          {value !== null && unit && <span className="ml-0.5 text-xs font-medium text-ink-3">{unit}</span>}
        </span>
        <button type="button" aria-label={`${label} erhöhen`} onClick={() => onChange(Math.min(max, v + step))} className="flex size-9 items-center justify-center rounded-xl bg-sunken text-ink-2 active:scale-90">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function ChoiceGroup<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T | null
  options: Array<{ value: T; label: string; icon?: ReactNode }>
  onChange: (v: T) => void
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 px-1 text-sm font-semibold text-ink-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-all active:scale-95',
              value === o.value ? 'border-sage-600 bg-sage-600 text-white' : 'border-line bg-surface text-ink-2 hover:border-line-strong',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
