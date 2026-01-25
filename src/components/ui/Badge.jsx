import { cn } from '../../lib/utils'
import { useEffect, useState } from 'react'

const variants = {
  coin: 'bg-coin-gold/20 text-coin-gold',
  success: 'bg-status-success/20 text-status-success',
  error: 'bg-status-error/20 text-status-error',
  info: 'bg-pastel-blue/20 text-pastel-blue',
  purple: 'bg-pastel-purple/20 text-pastel-purple',
  pink: 'bg-pastel-pink/20 text-pastel-pink',
}

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
}

export function Badge({
  children,
  variant = 'purple',
  size = 'md',
  className,
  ...props
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

// Special coin badge with animation
export function CoinBadge({
  amount,
  size = 'md',
  animated = false,
  className,
}) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [displayAmount, setDisplayAmount] = useState(amount)

  useEffect(() => {
    if (animated && amount !== displayAmount) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setDisplayAmount(amount)
        setIsAnimating(false)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setDisplayAmount(amount)
    }
  }, [amount, animated, displayAmount])

  return (
    <Badge
      variant="coin"
      size={size}
      className={cn(isAnimating && 'coin-bounce', className)}
    >
      🪙 {displayAmount}
    </Badge>
  )
}
