import { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { cardTypeColors } from '../../data/physicalRiskCards'

export function CardAnimation({ card, onComplete, onSkip, onDrink }) {
  const [isFlipping, setIsFlipping] = useState(true)

  useEffect(() => {
    // Card flip animation duration
    const timer = setTimeout(() => {
      setIsFlipping(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (!card) return null

  const colors = cardTypeColors[card.type] || cardTypeColors.reward

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
      {/* Card with flip animation */}
      <div className="perspective-1000 mb-8">
        <div
          className={`w-48 h-64 transition-transform duration-1000 ${
            isFlipping ? 'rotate-y-180' : 'rotate-y-0'
          }`}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Card Front (shown after flip) */}
          <div
            className={`absolute inset-0 rounded-2xl border-4 ${colors.border} ${colors.bg} p-6 flex flex-col items-center justify-center backface-hidden`}
          >
            <span className="text-7xl mb-4">{card.emoji}</span>
            <h3 className="text-xl font-bold text-white text-center mb-2">
              {card.name}
            </h3>
            <p className="text-sm text-white/80 text-center mb-4">
              {card.description}
            </p>

            {card.coin_change !== undefined && card.coin_change !== 0 && (
              <div className={`text-3xl font-bold ${colors.text}`}>
                {card.coin_change > 0 ? '+' : ''}{card.coin_change}🪙
              </div>
            )}
          </div>

          {/* Card Back (hidden after flip) */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-4 border-white/20 p-6 flex items-center justify-center backface-hidden rotate-y-180"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <span className="text-8xl">🎴</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!isFlipping && (
        <div className="w-full max-w-sm space-y-3 animate-fade-in">
          {/* Dare cards: Done or Skip options */}
          {card.type === 'dare' && (
            <>
              <Button
                variant="success"
                fullWidth
                onClick={onComplete}
                className="text-lg py-4"
              >
                ✓ Done!
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={onDrink}
                  className="py-3"
                >
                  🍺 Drink
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={onSkip}
                  className="py-3"
                >
                  💰 Pay 1🪙
                </Button>
              </div>
            </>
          )}

          {/* Social cards: Mark as done */}
          {card.type === 'social' && (
            <Button
              variant="success"
              fullWidth
              onClick={onComplete}
              className="text-lg py-4"
            >
              ✓ Done!
            </Button>
          )}

          {/* Drink cards: Confirm done */}
          {card.type === 'drink' && (
            <Button
              variant="primary"
              fullWidth
              onClick={onComplete}
              className="text-lg py-4"
            >
              🍺 Cheers!
            </Button>
          )}

          {/* All other cards: Continue */}
          {!['dare', 'social', 'drink'].includes(card.type) && (
            <Button
              variant="primary"
              fullWidth
              onClick={onComplete}
              className="text-lg py-4"
            >
              Continue
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
