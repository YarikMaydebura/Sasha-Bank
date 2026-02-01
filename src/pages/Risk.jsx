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
import { checkAndApplyBailout } from '../lib/balanceProtection'

// Fixed cost for Risk Station
const RISK_COST = 2

// Possible outcomes to display
const possibleWins = [
  { value: '+2', color: 'text-green-400' },
  { value: '+4', color: 'text-green-400' },
  { value: '+6', color: 'text-green-500' },
  { value: '+8', color: 'text-green-500' },
  { value: '+10', color: 'text-green-600' },
]

const possibleLosses = [
  { value: '-2', color: 'text-red-400' },
  { value: '-3', color: 'text-red-400' },
  { value: '-4', color: 'text-red-500' },
  { value: '-5', color: 'text-red-500' },
  { value: '-6', color: 'text-red-600' },
]

// Actual win amounts pool
const winAmounts = [2, 4, 6, 8, 10]
// Actual loss amounts pool
const lossAmounts = [2, 3, 4, 5, 6]

export function Risk() {
  const [isDrawing, setIsDrawing] = useState(false)
  const [result, setResult] = useState(null)
  const [wonCard, setWonCard] = useState(null)
  const [showResult, setShowResult] = useState(false)

  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  const handleDraw = async () => {
    if (user.balance < RISK_COST) {
      showToast('error', 'Not enough coins!')
      return
    }

    setIsDrawing(true)

    try {
      // Deduct entry cost
      const newBalance = user.balance - RISK_COST
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: RISK_COST,
        type: 'risk_entry',
        description: 'Risk station entry (2 coins)',
      })

      // Check if bailout needed after entry cost
      const { bailoutApplied, newBalance: balanceAfterEntry } = await checkAndApplyBailout(
        user.id,
        newBalance
      )

      // Track current balance after potential bailout
      const currentBalance = bailoutApplied ? balanceAfterEntry : newBalance

      if (bailoutApplied) {
        updateBalance(balanceAfterEntry)
        showToast('info', '🆘 Emergency bailout! +10 coins')
      } else {
        updateBalance(newBalance)
      }

      // Simulate card draw animation delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Determine outcome:
      // 25% chance: Win collectible card
      // 35% chance: Win coins (+2, +4, +6, +8, +10)
      // 40% chance: Lose coins (-2, -3, -4, -5, -6)
      const roll = Math.random()

      if (roll < 0.25) {
        // 25% - Win a collectible card!
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
          level: RISK_COST,
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
      } else if (roll < 0.60) {
        // 35% - Win coins
        const winAmount = winAmounts[Math.floor(Math.random() * winAmounts.length)]
        const resultBalance = currentBalance + winAmount

        await supabase
          .from('users')
          .update({ balance: resultBalance })
          .eq('id', user.id)

        await supabase.from('transactions').insert({
          to_user_id: user.id,
          amount: winAmount,
          type: 'risk_win',
          description: `Risk station win: +${winAmount} coins`,
        })

        updateBalance(resultBalance)

        // Create risk session for tracking
        await supabase.from('risk_sessions').insert({
          user_id: user.id,
          level: RISK_COST,
          status: 'completed',
          card_id: `WIN_${winAmount}`,
          completed_at: new Date().toISOString(),
        })

        setResult({
          type: 'win',
          coins: winAmount,
          emoji: winAmount >= 8 ? '💎' : winAmount >= 6 ? '💰' : '🎁',
          message: winAmount >= 8 ? 'JACKPOT!' : winAmount >= 6 ? 'Big Win!' : 'Nice!',
        })
      } else {
        // 40% - Lose coins
        const lossAmount = lossAmounts[Math.floor(Math.random() * lossAmounts.length)]
        const resultBalance = currentBalance - lossAmount

        await supabase
          .from('users')
          .update({ balance: Math.max(0, resultBalance) })
          .eq('id', user.id)

        await supabase.from('transactions').insert({
          from_user_id: user.id,
          amount: lossAmount,
          type: 'risk_loss',
          description: `Risk station loss: -${lossAmount} coins`,
        })

        // Check if bailout needed after loss
        const { bailoutApplied: lossRevive, newBalance: finalBalance } = await checkAndApplyBailout(
          user.id,
          Math.max(0, resultBalance)
        )

        if (lossRevive) {
          updateBalance(finalBalance)
          showToast('info', '🆘 Emergency bailout applied! +10 coins')
        } else {
          updateBalance(Math.max(0, resultBalance))
        }

        // Create risk session for tracking
        await supabase.from('risk_sessions').insert({
          user_id: user.id,
          level: RISK_COST,
          status: 'completed',
          card_id: `LOSS_${lossAmount}`,
          completed_at: new Date().toISOString(),
        })

        setResult({
          type: 'loss',
          coins: -lossAmount,
          emoji: lossAmount >= 5 ? '💀' : lossAmount >= 4 ? '😬' : '😅',
          message: lossAmount >= 5 ? 'Brutal!' : lossAmount >= 4 ? 'Ouch!' : 'Bad luck!',
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

  const handleReset = () => {
    setResult(null)
    setWonCard(null)
    setShowResult(false)
  }

  if (!user) return null

  const canAfford = user.balance >= RISK_COST

  return (
    <>
      <Header title="Risk Station" showBack showBalance />

      <PageWrapper withNav className="pt-0">
        {/* Main Risk Card */}
        <Card className="mb-6 text-center">
          <div className="text-6xl mb-4">🎰</div>
          <h2 className="text-2xl font-bold text-white mb-2">RISK IT!</h2>
          <p className="text-slate-400 mb-4">
            Pay 2🪙, draw a card, see what fate brings!
          </p>
          <div className="inline-block bg-purple-500/20 px-4 py-2 rounded-full">
            <span className="text-purple-300 text-sm">
              ✨ 25% chance to win a collectible card!
            </span>
          </div>
        </Card>

        {/* Possible Outcomes */}
        <Card className="mb-6">
          {/* Possible Wins */}
          <div className="mb-4">
            <h3 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
              <span>✨</span> POSSIBLE WINS:
            </h3>
            <div className="flex flex-wrap gap-2">
              {possibleWins.map((w, i) => (
                <span
                  key={i}
                  className={cn(
                    'px-3 py-1 bg-green-900/30 rounded-lg text-sm font-semibold',
                    w.color
                  )}
                >
                  {w.value}🪙
                </span>
              ))}
              <span className="px-3 py-1 bg-yellow-900/30 rounded-lg text-sm font-semibold text-yellow-400">
                🃏 Card!
              </span>
            </div>
          </div>

          {/* Possible Losses */}
          <div>
            <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
              <span>💀</span> POSSIBLE LOSSES:
            </h3>
            <div className="flex flex-wrap gap-2">
              {possibleLosses.map((l, i) => (
                <span
                  key={i}
                  className={cn(
                    'px-3 py-1 bg-red-900/30 rounded-lg text-sm font-semibold',
                    l.color
                  )}
                >
                  {l.value}🪙
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Play Button */}
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={handleDraw}
          loading={isDrawing}
          disabled={!canAfford || isDrawing}
          className={cn(
            'text-xl py-6',
            !canAfford && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isDrawing ? (
            '🎲 Drawing...'
          ) : canAfford ? (
            <>🎲 PLAY FOR 2🪙</>
          ) : (
            <>Not enough coins (need 2🪙)</>
          )}
        </Button>

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
                    <span
                      className={cn(
                        'text-8xl animate-card-flip',
                        wonCard?.rarity === 'common' && 'glow-common',
                        wonCard?.rarity === 'rare' && 'glow-rare',
                        wonCard?.rarity === 'epic' && 'glow-epic',
                        wonCard?.rarity === 'legendary' && 'glow-legendary'
                      )}
                    >
                      {wonCard?.emoji}
                    </span>
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
                // Coin result (win or loss)
                <>
                  <div
                    className={cn(
                      'w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-4',
                      result.type === 'win' && 'bg-green-500/20',
                      result.type === 'loss' && 'bg-red-500/20'
                    )}
                  >
                    <span className="text-7xl">{result.emoji}</span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{result.message}</h3>

                  <p
                    className={cn(
                      'text-4xl font-bold mb-4',
                      result.type === 'win' ? 'text-green-400' : 'text-red-400'
                    )}
                  >
                    {result.coins > 0 ? '+' : ''}
                    {result.coins}🪙
                  </p>

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
