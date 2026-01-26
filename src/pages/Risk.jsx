import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { WaitingScreen } from '../components/risk/WaitingScreen'
import { CardAnimation } from '../components/risk/CardAnimation'
import { getCardById } from '../data/physicalRiskCards'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

const riskLevels = [
  { cost: 1, label: 'Low', description: 'Safer cards', emoji: '😊' },
  { cost: 2, label: 'Med', description: 'Balanced risk', emoji: '😬' },
  { cost: 3, label: 'High', description: 'Big risks!', emoji: '💀' },
]

export function Risk() {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  const [selectedLevel, setSelectedLevel] = useState(null)
  const [riskSession, setRiskSession] = useState(null)
  const [drawnCard, setDrawnCard] = useState(null)
  const [status, setStatus] = useState('idle') // idle, waiting, assigned, completed

  // Subscribe to risk session updates
  useEffect(() => {
    if (!riskSession?.id) return

    const channel = supabase
      .channel(`risk_session:${riskSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'risk_sessions',
          filter: `id=eq.${riskSession.id}`,
        },
        (payload) => {
          console.log('Risk session updated:', payload.new)
          const updated = payload.new

          if (updated.status === 'assigned' && updated.card_id) {
            // Admin assigned a card
            const card = getCardById(updated.card_id)
            setDrawnCard(card)
            setStatus('assigned')

            // Apply coin changes immediately
            if (card.coin_change) {
              applyCardEffect(card)
            }

            // Apply special effects
            if (card.special) {
              applySpecialEffect(card)
            }
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [riskSession?.id])

  const handleSelectLevel = async (level) => {
    if (user.balance < level.cost) {
      showToast('error', 'Not enough coins!')
      return
    }

    setSelectedLevel(level)

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
        description: `Risk station entry (Level ${level.cost})`,
      })

      updateBalance(newBalance)

      // Create risk session
      const { data: session, error } = await supabase
        .from('risk_sessions')
        .insert({
          user_id: user.id,
          level: level.cost,
          status: 'waiting',
        })
        .select()
        .single()

      if (error) throw error

      setRiskSession(session)
      setStatus('waiting')

      // Notify all admins that someone is waiting
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: 'risk_waiting',
          title: '🎲 New Risk Session',
          message: `${user.name} is waiting for a Level ${level.cost} card`,
          data: {
            session_id: session.id,
            user_id: user.id,
            user_name: user.name,
            level: level.cost,
          },
        }))

        await supabase.from('notifications').insert(notifications)
      }
    } catch (error) {
      console.error('Error creating risk session:', error)
      showToast('error', 'Failed to start risk session')
    }
  }

  const applyCardEffect = async (card) => {
    if (!card.coin_change || card.coin_change === 0) return

    try {
      const newBalance = user.balance + card.coin_change
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        [card.coin_change > 0 ? 'to_user_id' : 'from_user_id']: user.id,
        amount: Math.abs(card.coin_change),
        type: 'risk_reward',
        description: `${card.name}: ${card.description}`,
      })

      updateBalance(newBalance)

      if (card.coin_change > 0) {
        showToast('success', `+${card.coin_change} coins!`)
      }
    } catch (error) {
      console.error('Error applying card effect:', error)
    }
  }

  const applySpecialEffect = async (card) => {
    try {
      if (card.special === 'immunity_shield') {
        await supabase
          .from('users')
          .update({ has_immunity_shield: true })
          .eq('id', user.id)

        showToast('success', '🛡️ Immunity shield activated!')

        // Remove after 10 minutes
        setTimeout(async () => {
          await supabase
            .from('users')
            .update({ has_immunity_shield: false })
            .eq('id', user.id)
        }, 10 * 60 * 1000)
      }

      if (card.special === 'double_reward') {
        await supabase
          .from('users')
          .update({ has_double_reward: true })
          .eq('id', user.id)

        showToast('success', '🎁 Next mission gives 2x coins!')
      }

      if (card.special === 'free_drink') {
        showToast('success', '🍹 Free drink voucher! Go to the bar!')
      }
    } catch (error) {
      console.error('Error applying special effect:', error)
    }
  }

  const handleComplete = async () => {
    try {
      // Update session status
      await supabase
        .from('risk_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', riskSession.id)

      showToast('success', 'Card completed!')
      resetGame()
    } catch (error) {
      console.error('Error completing card:', error)
      showToast('error', 'Failed to complete card')
    }
  }

  const handleSkip = async () => {
    if (user.balance < 1) {
      showToast('error', 'Not enough coins to skip!')
      return
    }

    try {
      // Deduct 1 coin
      const newBalance = user.balance - 1
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: 1,
        type: 'risk_skip',
        description: `Skipped dare: ${drawnCard.name}`,
      })

      updateBalance(newBalance)

      // Update session
      await supabase
        .from('risk_sessions')
        .update({
          status: 'declined',
          declined_action: 'coins',
          completed_at: new Date().toISOString(),
        })
        .eq('id', riskSession.id)

      showToast('info', 'Dare skipped for 1 coin')
      resetGame()
    } catch (error) {
      console.error('Error skipping card:', error)
      showToast('error', 'Failed to skip card')
    }
  }

  const handleDrink = async () => {
    try {
      // Create punishment (drink)
      await supabase.from('assigned_punishments').insert({
        to_user_id: user.id,
        punishment_text: `Take a drink (skipped: ${drawnCard.name})`,
        source: 'risk_decline',
        status: 'pending',
        deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      })

      // Update session
      await supabase
        .from('risk_sessions')
        .update({
          status: 'declined',
          declined_action: 'drink',
          completed_at: new Date().toISOString(),
        })
        .eq('id', riskSession.id)

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'punishment_assigned',
        title: '🍺 Drink Punishment',
        message: `Take a drink for skipping: ${drawnCard.name}. Complete within 30 minutes!`,
        data: { source: 'risk_decline', card_id: drawnCard.id },
      })

      showToast('info', 'Drink punishment added to Missions')
      resetGame()
    } catch (error) {
      console.error('Error creating drink punishment:', error)
      showToast('error', 'Failed to create punishment')
    }
  }

  const handleCancel = async () => {
    if (!riskSession) return

    try {
      // Cancel session and refund coins
      await supabase
        .from('risk_sessions')
        .update({ status: 'completed' })
        .eq('id', riskSession.id)

      const refundAmount = selectedLevel?.cost || 0
      if (refundAmount > 0) {
        const newBalance = user.balance + refundAmount
        await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', user.id)

        await supabase.from('transactions').insert({
          to_user_id: user.id,
          amount: refundAmount,
          type: 'refund',
          description: 'Risk session cancelled',
        })

        updateBalance(newBalance)
      }

      resetGame()
      showToast('info', 'Session cancelled')
    } catch (error) {
      console.error('Error cancelling session:', error)
    }
  }

  const resetGame = () => {
    setSelectedLevel(null)
    setRiskSession(null)
    setDrawnCard(null)
    setStatus('idle')
  }

  // Render based on status
  if (status === 'waiting' && riskSession) {
    return (
      <>
        <Header title="The Risk" showBack showBalance />
        <PageWrapper className="pt-0">
          <WaitingScreen level={selectedLevel?.cost} onCancel={handleCancel} />
        </PageWrapper>
      </>
    )
  }

  if (status === 'assigned' && drawnCard) {
    return (
      <>
        <Header title="The Risk" showBack={false} showBalance />
        <PageWrapper className="pt-0">
          <CardAnimation
            card={drawnCard}
            onComplete={handleComplete}
            onSkip={handleSkip}
            onDrink={handleDrink}
          />
        </PageWrapper>
      </>
    )
  }

  // Default: Level selection
  return (
    <>
      <Header title="The Risk" showBack showBalance />

      <PageWrapper className="pt-0">
        <div className="text-center py-8">
          <span className="text-6xl block mb-4">🎲</span>
          <h2 className="text-2xl font-bold text-white mb-2">
            Physical Risk Cards
          </h2>
          <p className="text-white/70">
            Pick a real card from the deck!
          </p>
        </div>

        {/* Risk levels */}
        <div className="mb-8">
          <p className="text-center text-white/60 text-sm mb-4">
            Choose your risk level:
          </p>
          <div className="flex gap-3 justify-center">
            {riskLevels.map((level) => (
              <Card
                key={level.cost}
                hoverable
                onClick={() => handleSelectLevel(level)}
                className={cn(
                  'w-28 text-center py-4',
                  user?.balance < level.cost && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="text-4xl mb-2 block">{level.emoji}</span>
                <p className="text-yellow-400 text-xl font-bold mb-1">
                  {level.cost}🪙
                </p>
                <p className="text-white text-sm font-medium">{level.label}</p>
                <p className="text-white/50 text-xs mt-1">{level.description}</p>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center text-white/50 text-sm space-y-2 px-4">
          <p>1. Pay coins and pick a physical card</p>
          <p>2. Show it to the admin</p>
          <p>3. Admin assigns it in their panel</p>
          <p>4. Complete the card challenge!</p>
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </PageWrapper>
    </>
  )
}
