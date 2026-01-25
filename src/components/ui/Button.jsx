import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-pastel-purple hover:bg-pastel-purple-medium text-bg-dark font-semibold',
  secondary: 'bg-bg-card hover:bg-bg-card-hover text-white border border-pastel-purple/30',
  ghost: 'bg-transparent hover:bg-bg-card text-pastel-purple-light',
  danger: 'bg-status-error/20 hover:bg-status-error/30 text-status-error',
  success: 'bg-status-success/20 hover:bg-status-success/30 text-status-success',
  gold: 'bg-coin-gold hover:bg-coin-glow text-bg-dark font-semibold',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-base rounded-xl',
  lg: 'px-6 py-3 text-lg rounded-xl',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  className,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all duration-200',
        'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
