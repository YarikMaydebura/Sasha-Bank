import { useState, useEffect } from 'react'
import { Spinner } from '../ui/Spinner'

export function WaitingScreen({ level, onCancel }) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      {/* Animated Card */}
      <div className="relative mb-8">
        <div className="w-40 h-56 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl border-2 border-white/20 flex items-center justify-center animate-pulse">
          <span className="text-6xl">🎴</span>
        </div>

        {/* Spinning indicator */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
          <Spinner size="lg" />
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">
          Pick Your Card{dots}
        </h2>

        <div className="space-y-2 text-white/70">
          <p className="text-lg font-medium">
            1. Pick a physical card from the Level {level} deck
          </p>
          <p className="text-lg font-medium">
            2. Show it to the admin
          </p>
          <p className="text-lg font-medium">
            3. Wait for admin to assign it
          </p>
        </div>

        <div className="pt-4">
          <p className="text-sm text-white/50">
            Waiting for admin to assign your card...
          </p>
        </div>
      </div>

      {/* Cancel button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-8 px-6 py-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
