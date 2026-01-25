import { useState, useEffect, useCallback } from 'react'
import { cn } from '../../lib/utils'

export function Timer({
  seconds: initialSeconds,
  onComplete,
  running = true,
  size = 'md',
  className,
}) {
  const [seconds, setSeconds] = useState(initialSeconds)

  useEffect(() => {
    setSeconds(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (!running || seconds <= 0) return

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [running, onComplete, seconds])

  const isUrgent = seconds <= 10

  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <div
      className={cn(
        'font-mono font-bold tabular-nums',
        sizes[size],
        isUrgent ? 'text-status-error animate-pulse' : 'text-pastel-purple-light',
        className
      )}
    >
      ⏱️ {seconds}
    </div>
  )
}

// Hook for countdown
export function useCountdown(initialSeconds, onComplete) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning || seconds <= 0) return

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsRunning(false)
          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isRunning, onComplete])

  const start = useCallback(() => {
    setIsRunning(true)
  }, [])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const reset = useCallback((newSeconds) => {
    setSeconds(newSeconds ?? initialSeconds)
    setIsRunning(false)
  }, [initialSeconds])

  return { seconds, isRunning, start, pause, reset }
}
