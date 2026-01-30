import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { processDodge, processStealSuccess } from '../lib/stealSystem'
import { useUserStore } from '../stores/userStore'
import { cn } from '../lib/utils'

/**
 * Steal Alert Popup - V3.0
 * Shows when someone is trying to steal from the user
 * 10-second countdown to DODGE
 */
export function StealAlertPopup() {
  const { user } = useUserStore()
  const [activeAttempt, setActiveAttempt] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isDodging, setIsDodging] = useState(false)
  const [result, setResult] = useState(null) // 'dodged' | 'stolen'

  // Subscribe to incoming steal attempts
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('steal_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'steal_attempts',
          filter: `victim_id=eq.${user.id}`
        },
        (payload) => {
          const attempt = payload.new
          if (attempt.status === 'pending') {
            setActiveAttempt(attempt)
            setResult(null)

            // Calculate time left
            const expiresAt = new Date(attempt.expires_at)
            const now = new Date()
            const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000))
            setTimeLeft(secondsLeft)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Countdown timer
  useEffect(() => {
    if (!activeAttempt || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - steal succeeds
          handleTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [activeAttempt, timeLeft])

  const handleTimeout = useCallback(async () => {
    if (!activeAttempt) return

    // Process successful steal
    await processStealSuccess(activeAttempt.id)
    setResult('stolen')

    // Auto-close after showing result
    setTimeout(() => {
      setActiveAttempt(null)
      setResult(null)
    }, 3000)
  }, [activeAttempt])

  const handleDodge = async () => {
    if (!activeAttempt || isDodging) return

    setIsDodging(true)
    const { success } = await processDodge(activeAttempt.id)

    if (success) {
      setResult('dodged')
    }

    setIsDodging(false)

    // Auto-close after showing result
    setTimeout(() => {
      setActiveAttempt(null)
      setResult(null)
    }, 2000)
  }

  if (!activeAttempt) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className={cn(
          'bg-gradient-to-br from-red-900 to-red-800 rounded-3xl p-8 max-w-sm mx-4 text-center shadow-2xl',
          'border-4 border-red-500 animate-pulse-border'
        )}
      >
        {!result ? (
          <>
            {/* Warning Icon */}
            <div className="text-7xl mb-4 animate-bounce">🚨</div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white mb-2">INCOMING STEAL!</h2>

            {/* Message */}
            <p className="text-red-200 mb-6">
              Someone is trying to steal <span className="font-bold text-yellow-400">{activeAttempt.amount} coins</span> from you!
            </p>

            {/* Countdown */}
            <div className="mb-6">
              <div
                className={cn(
                  'text-6xl font-bold',
                  timeLeft <= 3 ? 'text-yellow-400 animate-pulse' : 'text-white'
                )}
              >
                {timeLeft}
              </div>
              <p className="text-red-300 text-sm">seconds to dodge!</p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-red-950 rounded-full h-3 mb-6 overflow-hidden">
              <div
                className="bg-gradient-to-r from-yellow-400 to-red-500 h-full transition-all duration-1000"
                style={{ width: `${(timeLeft / 10) * 100}%` }}
              />
            </div>

            {/* DODGE Button */}
            <button
              onClick={handleDodge}
              disabled={isDodging}
              className={cn(
                'w-full py-4 rounded-xl text-xl font-bold',
                'bg-gradient-to-r from-green-500 to-green-600',
                'hover:from-green-400 hover:to-green-500',
                'active:scale-95 transition-all',
                'shadow-lg shadow-green-500/50',
                isDodging && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isDodging ? '...' : '🏃 DODGE!'}
            </button>
          </>
        ) : result === 'dodged' ? (
          // Success - Dodged
          <div className="py-4">
            <div className="text-7xl mb-4">🏃</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">YOU DODGED!</h2>
            <p className="text-green-200">The thief missed! Your coins are safe.</p>
          </div>
        ) : (
          // Failed - Stolen
          <div className="py-4">
            <div className="text-7xl mb-4">💸</div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">TOO SLOW!</h2>
            <p className="text-red-200">
              <span className="font-bold">{activeAttempt.amount} coins</span> were stolen from you!
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
          }
          50% {
            box-shadow: 0 0 40px rgba(239, 68, 68, 0.8);
          }
        }
        .animate-pulse-border {
          animation: pulse-border 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default StealAlertPopup
