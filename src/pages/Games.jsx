import { useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { CONSTANTS } from '../lib/utils'

export function Games() {
  const [showResult, setShowResult] = useState(null) // 'win' | 'lose' | null
  const [selectedPenalty, setSelectedPenalty] = useState(null)
  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)
  const { isOnCooldown, getCooldownRemaining, setCooldown } = useGameStore()

  const cooldownRemaining = getCooldownRemaining('games')
  const onCooldown = isOnCooldown('games')

  const handleWin = async () => {
    if (onCooldown) {
      showToast('warning', 'Cooldown active!')
      return
    }

    try {
      const newBalance = user.balance + 1
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        to_user_id: user.id,
        amount: 1,
        type: 'game_win',
        description: 'Won a bar game',
      })

      updateBalance(newBalance)
      setCooldown('games', CONSTANTS.GAME_COOLDOWN_MS)
      setShowResult('win')
    } catch (error) {
      console.error('Error recording win:', error)
      showToast('error', 'Failed to record win')
    }
  }

  const handleLose = () => {
    if (onCooldown) {
      showToast('warning', 'Cooldown active!')
      return
    }

    setShowResult('lose')
  }

  const handlePenalty = async (didTask) => {
    if (didTask) {
      // Did the task - no coin loss
      showToast('info', 'Good sport!')
    } else {
      // Took drink - lose 1 coin
      try {
        const newBalance = Math.max(CONSTANTS.MIN_BALANCE, user.balance - 1)
        await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', user.id)

        await supabase.from('transactions').insert({
          from_user_id: user.id,
          amount: 1,
          type: 'game_loss',
          description: 'Lost a bar game (took drink)',
        })

        updateBalance(newBalance)
      } catch (error) {
        console.error('Error recording loss:', error)
      }
    }

    setCooldown('games', CONSTANTS.GAME_COOLDOWN_MS)
    setShowResult(null)
    setSelectedPenalty(null)
  }

  return (
    <>
      <Header title="Challenge Table" showBack showBalance />

      <PageWrapper className="pt-0">
        <div className="text-center py-8">
          <span className="text-6xl block mb-4">🎮</span>
          <h2 className="text-xl font-semibold text-white mb-2">
            Bar Games
          </h2>
          <p className="text-slate-400">
            Rock Paper Scissors, Thumb Wars, Staring Contest...
          </p>
        </div>

        {/* Instructions */}
        <Card className="mb-6">
          <h3 className="text-white font-semibold mb-3">How it works:</h3>
          <ol className="text-slate-300 space-y-2 list-decimal list-inside">
            <li>Challenge someone to a game</li>
            <li>Play the game (for real!)</li>
            <li>Record your result below</li>
            <li>Winner gets +1🪙, loser picks penalty</li>
          </ol>
        </Card>

        {/* Result buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card
            hoverable={!onCooldown}
            onClick={!onCooldown ? handleWin : undefined}
            className={`text-center py-8 ${onCooldown ? 'opacity-50' : ''}`}
          >
            <span className="text-5xl block mb-2">🏆</span>
            <p className="text-white font-semibold">I Won</p>
            <p className="text-status-success text-sm">+1🪙</p>
          </Card>

          <Card
            hoverable={!onCooldown}
            onClick={!onCooldown ? handleLose : undefined}
            className={`text-center py-8 ${onCooldown ? 'opacity-50' : ''}`}
          >
            <span className="text-5xl block mb-2">😅</span>
            <p className="text-white font-semibold">I Lost</p>
            <p className="text-slate-400 text-sm">Pick penalty</p>
          </Card>
        </div>

        {onCooldown && (
          <p className="text-center text-status-warning">
            ⏱️ Cooldown: {Math.floor(cooldownRemaining / 60)}:{String(cooldownRemaining % 60).padStart(2, '0')}
          </p>
        )}

        <p className="text-center text-slate-500 text-sm mt-6">
          Play fair! The app trusts you. 🤝
        </p>
      </PageWrapper>

      {/* Win Modal */}
      <Modal
        isOpen={showResult === 'win'}
        onClose={() => setShowResult(null)}
      >
        <div className="text-center">
          <span className="text-6xl block mb-4">🎉</span>
          <h3 className="text-2xl font-bold text-white mb-2">You Win!</h3>
          <p className="text-coin-gold text-xl font-bold mb-6">+1🪙</p>
          <Button variant="primary" fullWidth onClick={() => setShowResult(null)}>
            Nice!
          </Button>
        </div>
      </Modal>

      {/* Lose Modal */}
      <Modal
        isOpen={showResult === 'lose'}
        onClose={() => setShowResult(null)}
        title="You Lost!"
      >
        <div className="text-center">
          <span className="text-5xl block mb-4">😅</span>
          <p className="text-slate-300 mb-6">Pick your penalty:</p>

          <div className="space-y-3">
            <Button
              variant="primary"
              fullWidth
              onClick={() => handlePenalty(true)}
            >
              ✓ I did the task (no loss)
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => handlePenalty(false)}
            >
              🍺 I took a drink (-1🪙)
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
