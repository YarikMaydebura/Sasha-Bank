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

  const coinValues = ['10', '20', '50', '100']
  const cardRarityOptions = ['common', 'rare', 'epic', 'legendary']
  const punishmentOptions = [
    '20 pushups',
    'Sing a song',
    'Bean Boozle candy',
    'Take a shot',
    'Dance solo for 30 seconds',
    'Tell a joke',
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

    if (winningTicket.status === 'won') {
      showToast('error', 'This ticket has already won')
      return
    }

    setIsDrawing(true)

    try {
      const winnerId = winningTicket.user_id
      const winnerName = winningTicket.users.name

      // Update ticket status
      await supabase
        .from('lottery_tickets')
        .update({
          status: 'won',
          winning_item: selectedPrizeValue,
          prize_type: selectedPrizeType,
          prize_value: selectedPrizeValue,
          drawn_at: new Date().toISOString(),
        })
        .eq('id', winningTicket.id)

      // Award prize based on type
      switch (selectedPrizeType) {
        case 'coins':
          const coinAmount = parseInt(selectedPrizeValue)
          const { data: userData } = await supabase
            .from('users')
            .select('balance')
            .eq('id', winnerId)
            .single()

          await supabase
            .from('users')
            .update({ balance: (userData.balance || 0) + coinAmount })
            .eq('id', winnerId)

          await supabase.from('transactions').insert({
            to_user_id: winnerId,
            amount: coinAmount,
            type: 'lottery_win',
            description: `Lottery prize: +${coinAmount} coins`,
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

  const activeTickets = tickets.filter((t) => t.status === 'active')
  const wonTickets = tickets.filter((t) => t.status === 'won')

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <div className="text-3xl font-bold text-white">{tickets.length}</div>
          <div className="text-slate-400 text-sm mt-1">Total Tickets</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-blue-400">{activeTickets.length}</div>
          <div className="text-slate-400 text-sm mt-1">Active</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-coin-gold">{wonTickets.length}</div>
          <div className="text-slate-400 text-sm mt-1">Winners</div>
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
                <input
                  type="text"
                  value={selectedPrizeValue}
                  onChange={(e) => setSelectedPrizeValue(e.target.value)}
                  placeholder="Enter physical prize name"
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
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
                  ticket.status === 'won'
                    ? 'bg-coin-gold/20 border border-coin-gold/30'
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
                      {ticket.status === 'won' && <Badge variant="coin">WINNER</Badge>}
                    </div>
                    <div className="text-slate-400 text-sm">{ticket.users?.name}</div>
                    {ticket.status === 'won' && ticket.winning_item && (
                      <div className="text-purple-300 text-xs mt-1">
                        Prize: {ticket.winning_item}
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
