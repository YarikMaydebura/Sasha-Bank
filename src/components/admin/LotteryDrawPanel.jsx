import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { supabase } from '../../lib/supabase'
import { useUIStore } from '../../stores/uiStore'
import { cn } from '../../lib/utils'
import { cards, cardRarities } from '../../data/cards'

export function LotteryDrawPanel() {
  const [tickets, setTickets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDrawing, setIsDrawing] = useState(false)
  const [winningTicketNumber, setWinningTicketNumber] = useState('')
  const [selectedPrizeType, setSelectedPrizeType] = useState('')
  const [selectedPrizeValue, setSelectedPrizeValue] = useState('')

  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    fetchAllTickets()

    // Real-time subscription for new tickets
    const channel = supabase
      .channel('lottery-tickets-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lottery_tickets',
        },
        () => {
          fetchAllTickets()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchAllTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('lottery_tickets')
        .select(`
          *,
          users (id, name)
        `)
        .order('ticket_number', { ascending: true })

      if (error) throw error
      setTickets(data || [])
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const prizeTypes = [
    { id: 'coins', name: 'Bonus Coins', emoji: '💰' },
    { id: 'card', name: 'Collectible Card', emoji: '🃏' },
    { id: 'punishment', name: 'Fun Challenge', emoji: '😈' },
    { id: 'physical', name: 'Physical Prize', emoji: '🎁' },
  ]

  // V3.0 - Updated coin values for instant lottery
  const coinValues = ['-1', '+5', '+8', '+10', '+15', '+20']
  const cardRarityOptions = ['common', 'rare', 'epic', 'legendary']
  // V3.0 - Fun challenges for instant lottery
  const punishmentOptions = [
    'Bean Boozle Challenge',
    'Truth or Dare',
    'Wild Card - Host Decides!',
    'Sing a verse',
    'Do 10 pushups',
  ]

  // Physical prizes for instant lottery
  const physicalPrizeOptions = [
    'Free Drink',
    'Snack of choice',
    'Party favor',
    'Mystery box item',
  ]

  const handleDrawWinner = async () => {
    if (!winningTicketNumber) {
      showToast('error', 'Please enter a ticket number')
      return
    }

    if (!selectedPrizeType) {
      showToast('error', 'Please select a prize type')
      return
    }

    if (!selectedPrizeValue) {
      showToast('error', 'Please select a prize value')
      return
    }

    const ticketNum = parseInt(winningTicketNumber)
    const winningTicket = tickets.find((t) => t.ticket_number === ticketNum)

    if (!winningTicket) {
      showToast('error', `Ticket #${ticketNum} not found`)
      return
    }

    // V3.0 - Check for pending (instant mode) or already claimed
    if (winningTicket.status === 'claimed' || winningTicket.status === 'won') {
      showToast('error', 'This ticket has already been processed')
      return
    }

    if (winningTicket.status !== 'pending') {
      showToast('error', 'This ticket is not pending')
      return
    }

    setIsDrawing(true)

    try {
      const winnerId = winningTicket.user_id
      const winnerName = winningTicket.users.name

      // Build prize description for user display
      let prizeDescription = selectedPrizeValue
      if (selectedPrizeType === 'coins') {
        prizeDescription = `${selectedPrizeValue} coins`
      } else if (selectedPrizeType === 'card') {
        prizeDescription = `${selectedPrizeValue.charAt(0).toUpperCase() + selectedPrizeValue.slice(1)} Card`
      }

      // V3.0 - Update ticket status to 'claimed' for instant mode
      await supabase
        .from('lottery_tickets')
        .update({
          status: 'claimed',
          winning_item: selectedPrizeValue,
          prize_type: selectedPrizeType,
          prize_value: selectedPrizeValue,
          prize_description: prizeDescription,
          drawn_at: new Date().toISOString(),
        })
        .eq('id', winningTicket.id)

      // Award prize based on type
      switch (selectedPrizeType) {
        case 'coins':
          // V3.0 - Parse coin amount (can be negative like "-1" or positive like "+10")
          const coinAmount = parseInt(selectedPrizeValue.replace('+', ''))
          const { data: userData } = await supabase
            .from('users')
            .select('balance')
            .eq('id', winnerId)
            .single()

          // Ensure balance doesn't go below 0
          const newBalance = Math.max(0, (userData.balance || 0) + coinAmount)
          await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', winnerId)

          await supabase.from('transactions').insert({
            to_user_id: winnerId,
            amount: Math.abs(coinAmount),
            type: coinAmount >= 0 ? 'lottery_win' : 'lottery_penalty',
            description: coinAmount >= 0
              ? `Lottery prize: +${coinAmount} coins`
              : `Lottery oops: ${coinAmount} coins`,
          })
          break

        case 'card':
          const rarity = selectedPrizeValue
          const eligibleCards = cards.filter((c) => c.rarity === rarity)
          const randomCard = eligibleCards[Math.floor(Math.random() * eligibleCards.length)]

          await supabase.from('user_cards').insert({
            user_id: winnerId,
            card_id: randomCard.id,
            card_name: randomCard.name,
            card_emoji: randomCard.emoji,
            description: randomCard.description,
            rarity: randomCard.rarity,
            status: 'owned',
            obtained_from: 'lottery',
          })
          break

        case 'punishment':
          await supabase.from('assigned_punishments').insert({
            to_user_id: winnerId,
            punishment_text: selectedPrizeValue,
            source: 'lottery',
            status: 'pending',
          })
          break

        case 'physical':
          // Physical prizes are manually given, just update the ticket
          break
      }

      // Notify winner
      await supabase.from('notifications').insert({
        user_id: winnerId,
        type: 'lottery_win',
        title: '🎰 Lottery Winner!',
        message: `Congratulations! You won: ${selectedPrizeValue}`,
        data: {
          ticket_number: ticketNum,
          prize_type: selectedPrizeType,
          prize_value: selectedPrizeValue,
        },
      })

      showToast('success', `🎉 ${winnerName} won: ${selectedPrizeValue}`)

      // Reset form
      setWinningTicketNumber('')
      setSelectedPrizeType('')
      setSelectedPrizeValue('')

      fetchAllTickets()
    } catch (error) {
      console.error('Error drawing winner:', error)
      showToast('error', 'Failed to process lottery draw')
    } finally {
      setIsDrawing(false)
    }
  }

  // V3.0 - Support both old (active/won) and new (pending/claimed) statuses
  const pendingTickets = tickets.filter((t) => t.status === 'pending' || t.status === 'active')
  const claimedTickets = tickets.filter((t) => t.status === 'claimed' || t.status === 'won')

  return (
    <div className="space-y-6">
      {/* Stats - V3.0 Instant Mode */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <div className="text-3xl font-bold text-white">{tickets.length}</div>
          <div className="text-slate-400 text-sm mt-1">Total Tickets</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-yellow-400">{pendingTickets.length}</div>
          <div className="text-slate-400 text-sm mt-1">⏳ Pending</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-green-400">{claimedTickets.length}</div>
          <div className="text-slate-400 text-sm mt-1">✓ Claimed</div>
        </Card>
      </div>

      {/* Draw Interface */}
      <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/40">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <span className="text-2xl">🎪</span>
          Draw Winner
        </h3>

        <div className="space-y-4">
          {/* Enter Ticket Number */}
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              Winning Ticket Number
            </label>
            <input
              type="number"
              value={winningTicketNumber}
              onChange={(e) => setWinningTicketNumber(e.target.value)}
              placeholder="Enter ticket #"
              className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white text-center text-xl font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Prize Type Selection */}
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              Prize Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {prizeTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedPrizeType(type.id)
                    setSelectedPrizeValue('')
                  }}
                  className={cn(
                    'px-4 py-3 rounded-lg border-2 transition-all',
                    selectedPrizeType === type.id
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                  )}
                >
                  <span className="text-2xl block mb-1">{type.emoji}</span>
                  <span className="text-sm">{type.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prize Value Selection */}
          {selectedPrizeType && (
            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block">
                Select Prize
              </label>

              {selectedPrizeType === 'coins' && (
                <div className="grid grid-cols-4 gap-2">
                  {coinValues.map((value) => (
                    <button
                      key={value}
                      onClick={() => setSelectedPrizeValue(value)}
                      className={cn(
                        'px-4 py-3 rounded-lg border-2 transition-all',
                        selectedPrizeValue === value
                          ? 'border-coin-gold bg-coin-gold/20 text-coin-gold'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                      )}
                    >
                      <span className="font-bold">+{value}🪙</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedPrizeType === 'card' && (
                <div className="grid grid-cols-2 gap-2">
                  {cardRarityOptions.map((rarity) => (
                    <button
                      key={rarity}
                      onClick={() => setSelectedPrizeValue(rarity)}
                      className={cn(
                        'px-4 py-3 rounded-lg border-2 transition-all text-left',
                        selectedPrizeValue === rarity
                          ? 'border-purple-500 bg-purple-500/20 text-white'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                      )}
                      style={{
                        borderColor:
                          selectedPrizeValue === rarity ? cardRarities[rarity]?.color : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="capitalize font-medium">{rarity}</span>
                        <span className="text-xs text-slate-400">
                          {rarity === 'common' && '50%'}
                          {rarity === 'rare' && '30%'}
                          {rarity === 'epic' && '15%'}
                          {rarity === 'legendary' && '5%'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedPrizeType === 'punishment' && (
                <div className="space-y-2">
                  {punishmentOptions.map((punishment) => (
                    <button
                      key={punishment}
                      onClick={() => setSelectedPrizeValue(punishment)}
                      className={cn(
                        'w-full px-4 py-3 rounded-lg border-2 transition-all text-left',
                        selectedPrizeValue === punishment
                          ? 'border-red-500 bg-red-500/20 text-white'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                      )}
                    >
                      {punishment}
                    </button>
                  ))}
                </div>
              )}

              {selectedPrizeType === 'physical' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {physicalPrizeOptions.map((prize) => (
                      <button
                        key={prize}
                        onClick={() => setSelectedPrizeValue(prize)}
                        className={cn(
                          'px-4 py-3 rounded-lg border-2 transition-all text-left',
                          selectedPrizeValue === prize
                            ? 'border-pink-500 bg-pink-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                        )}
                      >
                        🎁 {prize}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={physicalPrizeOptions.includes(selectedPrizeValue) ? '' : selectedPrizeValue}
                    onChange={(e) => setSelectedPrizeValue(e.target.value)}
                    placeholder="Or enter custom prize..."
                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Draw Button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleDrawWinner}
            loading={isDrawing}
            disabled={!winningTicketNumber || !selectedPrizeType || !selectedPrizeValue}
          >
            🎉 Confirm Winner
          </Button>
        </div>
      </Card>

      {/* All Tickets List */}
      <Card>
        <h3 className="text-white font-semibold mb-4">All Lottery Tickets</h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : tickets.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg',
                  (ticket.status === 'claimed' || ticket.status === 'won')
                    ? 'bg-green-500/20 border border-green-500/30'
                    : ticket.status === 'pending'
                    ? 'bg-yellow-500/20 border border-yellow-500/30 animate-pulse'
                    : 'bg-white/5 border border-white/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎟️</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono font-bold">
                        #{String(ticket.ticket_number).padStart(3, '0')}
                      </span>
                      {(ticket.status === 'claimed' || ticket.status === 'won') && (
                        <Badge variant="green">✓ CLAIMED</Badge>
                      )}
                      {ticket.status === 'pending' && (
                        <Badge variant="coin">⏳ WAITING</Badge>
                      )}
                    </div>
                    <div className="text-slate-400 text-sm">{ticket.users?.name}</div>
                    {(ticket.status === 'claimed' || ticket.status === 'won') && (ticket.prize_description || ticket.winning_item) && (
                      <div className="text-green-300 text-xs mt-1">
                        Prize: {ticket.prize_description || ticket.winning_item}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-400 py-8">No tickets purchased yet</div>
        )}
      </Card>
    </div>
  )
}
