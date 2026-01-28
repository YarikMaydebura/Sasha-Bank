import { useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { BottomNav } from '../components/layout/BottomNav'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { supabase } from '../lib/supabase'
import { getRandomCard, cardRarities } from '../data/cards'
import { cn } from '../lib/utils'

const riskLevels = [
  { cost: 1, label: 'Low', description: 'Small risks, small rewards', emoji: '😊' },
  { cost: 2, label: 'Med', description: 'Balanced risk & reward', emoji: '😬' },
  { cost: 3, label: 'High', description: 'High risk, high reward!', emoji: '💀' },
]

// Digital risk cards (automated, instant results)
const digitalRiskCards = [
  // Rewards
  { id: 'R1', type: 'reward', coins: 2, emoji: '🎁', message: 'Lucky! +2 coins' },
  { id: 'R2', type: 'reward', coins: 3, emoji: '💰', message: 'Nice! +3 coins' },
  { id: 'R3', type: 'reward', coins: 5, emoji: '💎', message: 'Jackpot! +5 coins' },
  { id: 'R4', type: 'reward', coins: 4, emoji: '✨', message: 'Great! +4 coins' },
  { id: 'R5', type: 'reward', coins: 1, emoji: '🪙', message: 'Small win +1 coin' },

  // Losses
  { id: 'L1', type: 'loss', coins: -1, emoji: '😅', message: 'Close call! -1 coin' },
  { id: 'L2', type: 'loss', coins: -2, emoji: '😬', message: 'Oops! -2 coins' },
  { id: 'L3', type: 'loss', coins: -3, emoji: '💀', message: 'Brutal! -3 coins' },

  // Neutral
  { id: 'N1', type: 'neutral', coins: 0, emoji: '😐', message: 'Nothing happens' },
  { id: 'N2', type: 'neutral', coins: 0, emoji: '🤷', message: 'Break even' },
]

export function Risk() {
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [result, setResult] = useState(null)
  const [wonCard, setWonCard] = useState(null)
  const [showResult, setShowResult] = useState(false)

  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  const handleDraw = async () => {
    if (!selectedLevel || user.balance < selectedLevel.cost) {
      showToast('error', 'Not enough coins!')
      return
    }

    setIsDrawing(true)

    try {
      // Deduct entry cost
      const newBalance = user.balance - selectedLevel.cost
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: selectedLevel.cost,
        type: 'risk_entry',
        description: `Risk station entry (Level ${selectedLevel.cost})`,
      })

      updateBalance(newBalance)

      // Simulate card draw animation delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // 10% chance to win a collectible card instead of coins
      const wonCollectibleCard = Math.random() < 0.10

      if (wonCollectibleCard) {
        // User won a collectible card!
        const card = getRandomCard()
        setWonCard(card)

        // Create card record
        await supabase.from('user_cards').insert({
          user_id: user.id,
          card_id: card.id,
          card_name: card.name,
          card_emoji: card.emoji,
          description: card.description,
          rarity: card.rarity,
          status: 'owned',
          obtained_from: 'risk',
        })

        // Create risk session for tracking
        await supabase.from('risk_sessions').insert({
          user_id: user.id,
          level: selectedLevel.cost,
          status: 'completed',
          card_reward_id: card.id,
          card_reward_name: card.name,
          card_reward_rarity: card.rarity,
          completed_at: new Date().toISOString(),
        })

        setResult({
          type: 'card',
          card: card,
          message: `You won a ${card.rarity} card!`,
        })
      } else {
        // Normal coin result
        const drawnCard = getRandomDigitalCard(selectedLevel.cost)
        const finalCoins = drawnCard.coins

        // Apply coin change
        if (finalCoins !== 0) {
          const resultBalance = newBalance + finalCoins
          await supabase
            .from('users')
            .update({ balance: resultBalance })
            .eq('id', user.id)

          await supabase.from('transactions').insert({
            from_user_id: finalCoins < 0 ? user.id : null,
            to_user_id: finalCoins > 0 ? user.id : null,
            amount: Math.abs(finalCoins),
            type: finalCoins > 0 ? 'risk_win' : 'risk_loss',
            description: drawnCard.message,
          })

          updateBalance(resultBalance)
        }

        // Create risk session for tracking
        await supabase.from('risk_sessions').insert({
          user_id: user.id,
          level: selectedLevel.cost,
          status: 'completed',
          card_id: drawnCard.id,
          completed_at: new Date().toISOString(),
        })

        setResult({
          type: 'coins',
          ...drawnCard,
        })
      }

      setShowResult(true)
    } catch (error) {
      console.error('Error in Risk draw:', error)
      showToast('error', 'Something went wrong!')
    } finally {
      setIsDrawing(false)
    }
  }

  const getRandomDigitalCard = (level) => {
    // Filter cards based on level
    let pool = [...digitalRiskCards]

    if (level === 1) {
      // Low risk: more neutral/small rewards, fewer big losses
      pool = digitalRiskCards.filter(
        (c) => c.type === 'neutral' || (c.type === 'reward' && c.coins <= 3) || c.id === 'L1'
      )
    } else if (level === 2) {
      // Medium: balanced
      pool = digitalRiskCards
    } else if (level === 3) {
      // High risk: more big rewards and big losses
      pool = digitalRiskCards.filter(
        (c) => c.type !== 'neutral' && (c.coins >= 3 || c.coins <= -2)
      )
    }

    return pool[Math.floor(Math.random() * pool.length)]
  }

  const handleReset = () => {
    setSelectedLevel(null)
    setResult(null)
    setWonCard(null)
    setShowResult(false)
  }

  if (!user) return null

  return (
    <>
      <Header title="Risk Station" showBack showBalance />

      <PageWrapper withNav className="pt-0">
        <Card className="mb-6">
          <p className="text-slate-400 text-sm mb-2">
            Pick a card, any card... 🎲
          </p>
          <p className="text-slate-300 text-sm">
            Choose your risk level and draw a card. Win or lose coins instantly!
          </p>
          <p className="text-purple-400 text-xs mt-2">
            ✨ 10% chance to win a collectible card!
          </p>
        </Card>

        {/* Level Selection */}
        {!selectedLevel && (
          <div className="space-y-4">
            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wide">
              Choose Risk Level
            </h3>

            {riskLevels.map((level) => {
              const canAfford = user.balance >= level.cost

              return (
                <Card
                  key={level.cost}
                  hoverable={canAfford}
                  onClick={canAfford ? () => setSelectedLevel(level) : undefined}
                  className={cn(
                    'flex items-center gap-4',
                    !canAfford && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="text-4xl">{level.emoji}</span>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold">{level.label} Risk</h4>
                    <p className="text-slate-400 text-sm">{level.description}</p>
                  </div>
                  <span className="text-coin-gold font-bold text-lg">{level.cost}🪙</span>
                </Card>
              )
            })}
          </div>
        )}

        {/* Draw Card Interface */}
        {selectedLevel && !showResult && (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-32 h-32 mx-auto bg-purple-500/20 rounded-3xl flex items-center justify-center mb-4">
                <span className="text-6xl">{selectedLevel.emoji}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {selectedLevel.label} Risk
              </h3>
              <p className="text-slate-400 text-sm mb-1">{selectedLevel.description}</p>
              <p className="text-coin-gold font-semibold">Entry: {selectedLevel.cost}🪙</p>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                onClick={handleDraw}
                loading={isDrawing}
              >
                {isDrawing ? 'Drawing...' : 'Draw Card'}
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setSelectedLevel(null)}>
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Result Modal */}
        <Modal
          isOpen={showResult}
          onClose={handleReset}
          title={result?.type === 'card' ? '🎉 CARD WON!' : 'Result'}
        >
          {result && (
            <div className="text-center">
              {result.type === 'card' ? (
                // Collectible card won!
                <>
                  <div
                    className="w-40 h-40 mx-auto rounded-3xl flex items-center justify-center mb-4"
                    style={{
                      backgroundColor: cardRarities[wonCard?.rarity]?.color + '20',
                      boxShadow: `0 0 30px ${cardRarities[wonCard?.rarity]?.glow}`,
                    }}
                  >
                    <span className="text-8xl animate-bounce">{wonCard?.emoji}</span>
                  </div>

                  <div
                    className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-2"
                    style={{
                      backgroundColor: cardRarities[wonCard?.rarity]?.color,
                      color: 'white',
                    }}
                  >
                    {cardRarities[wonCard?.rarity]?.name}
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">{wonCard?.name}</h3>
                  <p className="text-slate-300 mb-4">{wonCard?.description}</p>

                  <div className="bg-purple-500/20 rounded-xl p-4 mb-6">
                    <p className="text-purple-300 text-sm">
                      🎴 Card added to your collection!
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      View in "My Cards" page
                    </p>
                  </div>
                </>
              ) : (
                // Coin result
                <>
                  <div
                    className={cn(
                      'w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-4',
                      result.type === 'reward' && 'bg-green-500/20',
                      result.type === 'loss' && 'bg-red-500/20',
                      result.type === 'neutral' && 'bg-slate-500/20'
                    )}
                  >
                    <span className="text-7xl">{result.emoji}</span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{result.message}</h3>

                  {result.coins !== 0 && (
                    <p
                      className={cn(
                        'text-3xl font-bold mb-4',
                        result.coins > 0 ? 'text-green-400' : 'text-red-400'
                      )}
                    >
                      {result.coins > 0 ? '+' : ''}
                      {result.coins}🪙
                    </p>
                  )}

                  <p className="text-slate-400 text-sm">
                    New balance: {user.balance}🪙
                  </p>
                </>
              )}

              <Button variant="primary" fullWidth className="mt-6" onClick={handleReset}>
                Play Again
              </Button>
            </div>
          )}
        </Modal>
      </PageWrapper>

      <BottomNav />
    </>
  )
}
