import { cn } from '../../lib/utils'

export function Input({
  label,
  error,
  className,
  containerClassName,
  ...props
}) {
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label className="block text-sm text-pastel-purple-light mb-2">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full bg-bg-input border border-pastel-purple/30 rounded-xl',
          'px-4 py-3 text-white placeholder-slate-500',
          'focus:outline-none focus:border-pastel-purple focus:ring-1 focus:ring-pastel-purple/50',
          'transition-all duration-200',
          error && 'border-status-error focus:border-status-error focus:ring-status-error/50',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-status-error">{error}</p>
      )}
    </div>
  )
}
