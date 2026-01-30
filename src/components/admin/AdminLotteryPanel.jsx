import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/utils'

/**
 * Admin Lottery Panel - V3.0 Instant Prize
 * Admin enters prize after user picks paper from hat
 */

// Quick prize options
const quickPrizes = [
  { type: 'coins', amount: 5, label: '+5🪙', emoji: '💰' },
  { type: 'coins', amount: 8, label: '+8🪙', emoji: '💰' },
  { type: 'coins', amount: 10, label: '+10🪙', emoji: '💰' },
  { type: 'coins', amount: 15, label: '+15🪙', emoji: '💎' },
  { type: 'coins', amount: 20, label: '+20🪙', emoji: '🏆' },
  { type: 'coins', amount: -1, label: '-1🪙', emoji: '😅' },
  { type: 'card', card_id: 'shield', label: 'Shield Card', emoji: '🛡️' },
  { type: 'card', card_id: 'steal', label: 'Steal Card', emoji: '💰' },
  { type: 'card', card_id: 'dj_power', label: 'DJ Card', emoji: '🎧' },
  { type: 'physical', label: 'Physical Prize', emoji: '🎁' },
  { type: 'challenge', label: 'Fun Challenge', emoji: '😈' },
]

export function AdminLotteryPanel() {
  const [pendingTickets, setPendingTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [customPrize, setCustomPrize] = useState('')
  const [awarding, setAwarding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPendingTickets()

    // Subscribe to new tickets
    const channel = supabase
      .channel('admin_lottery')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lottery_tickets' },
        loadPendingTickets
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadPendingTickets() {
    const { data, error } = await supabase
      .from('lottery_tickets')
      .select('*, user:user_id(id, name, balance)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (!error) {
      setPendingTickets(data || [])
    }
    setLoading(false)
  }

  async function awardPrize(ticket, prize) {
    setAwarding(true)

    try {
      let prizeDescription = ''
      let prizeType = prize.type
      let prizeAmount = prize.amount || 0

      // Handle different prize types
      if (prize.type === 'coins') {
        prizeDescription = `${prizeAmount >= 0 ? '+' : ''}${prizeAmount} coins`

        // Update user balance
        const newBalance = (ticket.user?.balance || 0) + prizeAmount
        await supabase
          .from('users')
          .update({ balance: Math.max(0, newBalance) })
          .eq('id', ticket.user_id)

        // Create transaction
        if (prizeAmount !== 0) {
          await supabase.from('transactions').insert({
            to_user_id: ticket.user_id,
            amount: Math.abs(prizeAmount),
            type: prizeAmount > 0 ? 'lottery_win' : 'lottery_loss',
            description: `Lottery prize: ${prizeDescription}`
          })
        }
      } else if (prize.type === 'card') {
        prizeDescription = `${prize.label}`

        // Award card to user
        await supabase.from('user_cards').insert({
          user_id: ticket.user_id,
          card_id: prize.card_id,
          card_name: prize.label,
          card_emoji: prize.emoji,
          rarity: 'rare',
          status: 'owned',
          obtained_from: 'lottery'
        })
      } else if (prize.type === 'physical') {
        prizeDescription = customPrize || 'Physical Prize'
      } else if (prize.type === 'challenge') {
        prizeDescription = customPrize || 'Fun Challenge'
      }

      // Update ticket as claimed
      await supabase
        .from('lottery_tickets')
        .update({
          status: 'claimed',
          prize_type: prizeType,
          prize_amount: prizeAmount,
          prize_description: prizeDescription
        })
        .eq('id', ticket.id)

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: ticket.user_id,
        type: 'lottery_prize',
        title: '🎰 Lottery Prize!',
        message: `You won: ${prizeDescription}`,
        data: { ticket_id: ticket.id, prize_type: prizeType, prize_amount: prizeAmount }
      })

      setSelectedTicket(null)
      setCustomPrize('')
      loadPendingTickets()
    } catch (error) {
      console.error('Error awarding prize:', error)
    }

    setAwarding(false)
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading lottery tickets...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🎰</span> Instant Lottery
        </h2>
        <Badge variant="purple">{pendingTickets.length} pending</Badge>
      </div>

      {/* Pending Tickets */}
      {pendingTickets.length === 0 ? (
        <Card className="text-center py-8">
          <div className="text-4xl mb-3">🎟️</div>
          <p className="text-slate-400">No pending lottery tickets</p>
          <p className="text-slate-500 text-sm mt-1">Waiting for users to buy tickets...</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className={cn(
                'cursor-pointer transition-all',
                selectedTicket?.id === ticket.id
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'hover:border-slate-600'
              )}
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎫</span>
                  <div>
                    <p className="text-white font-bold">
                      Ticket #{String(ticket.ticket_number).padStart(3, '0')}
                    </p>
                    <p className="text-slate-400 text-sm">{ticket.user?.name || 'Unknown'}</p>
                  </div>
                </div>
                <Badge variant="coin">⏳ Waiting</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Prize Selection Modal */}
      {selectedTicket && (
        <Card className="border-purple-500 bg-purple-500/10">
          <h3 className="text-lg font-bold text-white mb-4">
            Award Prize to {selectedTicket.user?.name}
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Ticket #{String(selectedTicket.ticket_number).padStart(3, '0')}
          </p>

          {/* Quick Prize Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {quickPrizes.map((prize) => (
              <Button
                key={prize.label}
                variant="secondary"
                size="sm"
                onClick={() => awardPrize(selectedTicket, prize)}
                disabled={awarding}
                className="flex flex-col items-center py-3"
              >
                <span className="text-xl">{prize.emoji}</span>
                <span className="text-xs mt-1">{prize.label}</span>
              </Button>
            ))}
          </div>

          {/* Custom Prize Input */}
          <div className="mb-4">
            <label className="text-slate-400 text-sm mb-1 block">
              Custom Prize Description (for physical/challenge)
            </label>
            <input
              type="text"
              value={customPrize}
              onChange={(e) => setCustomPrize(e.target.value)}
              placeholder="e.g., Free drink at bar"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setSelectedTicket(null)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

export default AdminLotteryPanel
