import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { drawRiskCard } from '../data/riskCards'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { supabase } from '../lib/supabase'
import { cn, CONSTANTS } from '../lib/utils'

const riskLevels = [
  { cost: 1, label: 'Low', description: 'Safe-ish' },
  { cost: 2, label: 'Med', description: 'Risky' },
  { cost: 3, label: 'High', description: 'Dangerous!' },
]

export function Risk() {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  const [selectedLevel, setSelectedLevel] = useState(null)
  const [drawnCard, setDrawnCard] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [showResult, setShowResult] = useState(false)

  const handleDraw = async (level) => {
    if (user.balance < level.cost) {
      showToast('error', "Not enough coins!")
      return
    }

    setSelectedLevel(level)
    setIsDrawing(true)

    try {
      // Deduct cost
      const newBalance = user.balance - level.cost
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: level.cost,
        type: 'risk_draw',
        description: `Risk card draw (level ${level.cost})`,
      })

      updateBalance(newBalance)

      // Draw card
      const card = drawRiskCard()
      setDrawnCard(card)

      // Simulate card flip animation
      setTimeout(() => {
        setIsDrawing(false)
        setShowResult(true)

        // Apply card effect if it changes coins
        if (card.coin_change !== 0) {
          applyCardEffect(card, newBalance)
        }
      }, 1500)
    } catch (error) {
      console.error('Error drawing card:', error)
      showToast('error', 'Failed to draw card')
      setIsDrawing(false)
    }
  }

  const applyCardEffect = async (card, currentBalance) => {
    if (card.coin_change === 0) return

    try {
      let finalBalance = currentBalance + card.coin_change
      if (finalBalance < CONSTANTS.MIN_BALANCE) {
        finalBalance = CONSTANTS.MIN_BALANCE
      }

      await supabase
        .from('users')
        .update({ balance: finalBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        [card.coin_change > 0 ? 'to_user_id' : 'from_user_id']: user.id,
        amount: Math.abs(card.coin_change),
        type: 'risk_effect',
        description: card.display_text,
      })

      updateBalance(finalBalance)

      if (card.coin_change > 0) {
        showToast('success', `+${card.coin_change} coins!`)
      }
    } catch (error) {
      console.error('Error applying card effect:', error)
    }
  }

  const handleDrinkToCancel = async () => {
    // If card allows drinking to cancel loss, restore coins
    if (drawnCard?.can_drink_cancel) {
      try {
        const restoredBalance = user.balance - drawnCard.coin_change
        await supabase
          .from('users')
          .update({ balance: restoredBalance })
          .eq('id', user.id)

        updateBalance(restoredBalance)
        showToast('info', 'Drink taken! Loss cancelled.')
      } catch (error) {
        console.error('Error restoring balance:', error)
      }
    }
    resetGame()
  }

  const resetGame = () => {
    setSelectedLevel(null)
    setDrawnCard(null)
    setShowResult(false)
  }

  return (
    <>
      <Header title="The Risk" showBack showBalance />

      <PageWrapper className="pt-0">
        <div className="text-center py-8">
          <span className="text-6xl block mb-4">🎲</span>
          <h2 className="text-xl font-semibold text-white mb-2">
            Draw a card.
          </h2>
          <p className="text-pastel-purple-light">Face your fate.</p>
        </div>

        {/* Risk levels */}
        <div className="mb-8">
          <p className="text-center text-slate-400 text-sm mb-4">
            Choose your risk level:
          </p>
          <div className="flex gap-3 justify-center">
            {riskLevels.map((level) => (
              <Card
                key={level.cost}
                hoverable
                onClick={() => handleDraw(level)}
                className={cn(
                  'w-24 text-center py-4',
                  user?.balance < level.cost && 'opacity-50 cursor-not-allowed'
                )}
              >
                <p className="text-coin-gold text-xl font-bold mb-1">
                  {level.cost}🪙
                </p>
                <p className="text-white text-sm font-medium">{level.label}</p>
                <p className="text-slate-500 text-xs mt-1">{level.description}</p>
              </Card>
            ))}
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm">
          Higher risk = Higher rewards (and bigger losses!)
        </p>
      </PageWrapper>

      {/* Drawing animation modal */}
      <Modal isOpen={isDrawing} showClose={false}>
        <div className="text-center py-8">
          <div className="w-32 h-44 bg-pastel-purple/20 rounded-xl mx-auto flex items-center justify-center animate-pulse">
            <span className="text-4xl">🎴</span>
          </div>
          <p className="text-slate-400 mt-4">Drawing...</p>
        </div>
      </Modal>

      {/* Result modal */}
      <Modal isOpen={showResult && !!drawnCard} onClose={resetGame}>
        {drawnCard && (
          <div className="text-center">
            <div
              className={cn(
                'w-40 h-56 rounded-xl mx-auto flex flex-col items-center justify-center p-4 mb-6',
                drawnCard.coin_change > 0 && 'bg-coin-gold/20 border-2 border-coin-gold',
                drawnCard.coin_change < 0 && 'bg-status-error/20 border-2 border-status-error',
                drawnCard.coin_change === 0 && 'bg-pastel-purple/20 border-2 border-pastel-purple'
              )}
            >
              <span className="text-4xl mb-2">{drawnCard.emoji}</span>
              <p className="text-white font-bold text-lg mb-2">
                {drawnCard.coin_change > 0 && `+${drawnCard.coin_change}🪙`}
                {drawnCard.coin_change < 0 && `${drawnCard.coin_change}🪙`}
                {drawnCard.coin_change === 0 && drawnCard.effect}
              </p>
              <p className="text-slate-300 text-sm text-center">
                {drawnCard.display_text}
              </p>
            </div>

            {/* Actions based on card type */}
            <div className="space-y-3">
              {drawnCard.type === 'dare' && (
                <>
                  <Button variant="success" fullWidth onClick={resetGame}>
                    ✓ I did it!
                  </Button>
                  <Button variant="danger" fullWidth onClick={resetGame}>
                    🍺 Skip + Drink
                  </Button>
                </>
              )}

              {drawnCard.can_drink_cancel && drawnCard.coin_change < 0 && (
                <Button variant="secondary" fullWidth onClick={handleDrinkToCancel}>
                  🍺 Drink to cancel loss
                </Button>
              )}

              <Button variant="primary" fullWidth onClick={resetGame}>
                Draw Again
              </Button>
              <Button variant="ghost" fullWidth onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
