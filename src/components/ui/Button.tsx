import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-sage-600 text-white shadow-[0_6px_16px_-6px_rgb(78_107_87/0.6)] hover:bg-sage-700',
  secondary: 'bg-surface text-ink border border-line hover:border-line-strong',
  soft: 'bg-sage-100 text-sage-800 hover:bg-sage-200',
  ghost: 'text-ink-2 hover:bg-sunken',
  danger: 'bg-clay-100 text-alert hover:bg-clay-400/30',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-12 px-5 text-[15px] gap-2 rounded-2xl',
  lg: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  iconRight?: LucideIcon
  block?: boolean
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, block, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className={size === 'sm' ? 'size-4' : 'size-[18px]'} strokeWidth={2.2} />}
      {children}
      {IconRight && <IconRight className={size === 'sm' ? 'size-4' : 'size-[18px]'} strokeWidth={2.2} />}
    </button>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  variant?: 'surface' | 'ghost' | 'glass'
}

export function IconButton({ icon: Icon, label, variant = 'surface', className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-all active:scale-90',
        variant === 'surface' && 'bg-surface text-ink border border-line hover:border-line-strong',
        variant === 'ghost' && 'text-ink-2 hover:bg-sunken',
        variant === 'glass' && 'bg-white/55 text-ink backdrop-blur-md hover:bg-white/75',
        className,
      )}
      {...rest}
    >
      <Icon className="size-5" strokeWidth={2} />
    </button>
  )
}
