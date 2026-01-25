import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-bg-card border-pastel-purple/20',
  glow: 'bg-bg-card border-pastel-purple/30 shadow-glow-purple',
  highlight: 'bg-gradient-to-br from-pastel-purple-dark/20 to-pastel-pink/10 border-pastel-purple/30',
  gold: 'bg-gradient-to-br from-coin-gold/20 to-coin-glow/10 border-coin-gold/30 shadow-glow-coin',
}

export function Card({
  children,
  variant = 'default',
  hoverable = false,
  onClick,
  className,
  ...props
}) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      className={cn(
        'rounded-2xl border p-4 transition-all duration-200',
        variants[variant],
        hoverable && 'card-hover cursor-pointer',
        onClick && 'w-full text-left',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  )
}
