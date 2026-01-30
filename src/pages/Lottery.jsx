import { useState, useEffect } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { CONSTANTS, cn } from '../lib/utils'

/**
 * V3.0 Lottery - Instant Prize Mode
 * Flow: Buy ticket → Go to admin → Pick paper → Admin enters prize → Get reward!
 */

const LOTTERY_COST = CONSTANTS.LOTTERY_COST || 10

// Prize categories for display
const prizeCategories = [
  {
    emoji: '💰',
    name: 'Bonus Coins',
    description: '+5, +8, +10, +15, +20 coins (or -1 oops!)',
    chance: '60%'
  },
  {
    emoji: '🎁',
    name: 'Physical Prizes',
    description: 'Drinks, snacks, party favors',
    chance: '30%'
  },
  {
    emoji: '🃏',
    name: 'Special Cards',
    description: 'Shield, DJ Power, Steal cards',
    chance: '8%'
  },
  {
    emoji: '😈',
    name: 'Fun Challenges',
    description: 'Bean Boozle, dare, wild card',
    chance: '2%'
  }
]

export function Lottery() {
  const [tickets, setTickets] = useState([])
  const [nextNumber, setNextNumber] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isBuying, setIsBuying] = useState(false)
  const [pendingTicket, setPendingTicket] = useState(null)

  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    fetchTickets()

    // Subscribe to ticket updates (for instant prizes)
    const channel = supabase
      .channel('lottery_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lottery_tickets',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          const updatedTicket = payload.new
          if (updatedTicket.status === 'claimed' && updatedTicket.prize_type) {
            // Prize was awarded!
            showToast('success', `🎉 You won: ${updatedTicket.prize_description}!`)
            fetchTickets()
            setPendingTicket(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const fetchTickets = async () => {
    if (!user?.id) return

    try {
      const { data: userTickets, error } = await supabase
        .from('lottery_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTickets(userTickets || [])

      // Check for pending ticket (bought but not claimed)
      const pending = userTickets?.find(t => t.status === 'pending')
      setPendingTicket(pending)

      // Get next ticket number
      const { data: lastTicket } = await supabase
        .from('lottery_tickets')
        .select('ticket_number')
        .order('ticket_number', { ascending: false })
        .limit(1)
        .single()

      setNextNumber((lastTicket?.ticket_number || 0) + 1)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBuyTicket = async () => {
    if (!user) return

    if (user.balance < LOTTERY_COST) {
      showToast('error', 'Not enough coins!')
      return
    }

    // Check if already has pending ticket
    if (pendingTicket) {
      showToast('error', 'You have a pending ticket! Go to admin first.')
      return
    }

    setIsBuying(true)

    try {
      // Deduct cost
      const newBalance = user.balance - LOTTERY_COST
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      // Create ticket with 'pending' status (waiting for admin to award prize)
      const { data: ticket, error } = await supabase
        .from('lottery_tickets')
        .insert({
          user_id: user.id,
          ticket_number: nextNumber,
          status: 'pending' // Changed from 'active' to 'pending'
        })
        .select()
        .single()

      if (error) throw error

      // Log transaction
      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: LOTTERY_COST,
        type: 'lottery_ticket',
        description: `Lottery ticket #${ticket.ticket_number}`
      })

      updateBalance(newBalance)
      setPendingTicket(ticket)
      showToast('success', `🎟️ Ticket #${ticket.ticket_number} - Now go to admin!`)
      fetchTickets()
    } catch (error) {
      console.error('Error buying ticket:', error)
      showToast('error', 'Failed to buy ticket')
    } finally {
      setIsBuying(false)
    }
  }

  const canBuy = (user?.balance || 0) >= LOTTERY_COST && !pendingTicket

  return (
    <>
      <Header title="Lottery" showBack showBalance />

      <PageWrapper className="pt-0">
        <div className="text-center py-6">
          <span className="text-6xl block mb-4">🎰</span>
          <h2 className="text-2xl font-bold text-white mb-2">INSTANT LOTTERY</h2>
          <div className="h-0.5 w-16 bg-pastel-purple mx-auto" />
        </div>

        {/* Pending Ticket Alert */}
        {pendingTicket && (
          <Card className="mb-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 animate-pulse">
            <div className="text-center py-4">
              <span className="text-5xl block mb-3">🎫</span>
              <h3 className="text-xl font-bold text-yellow-400 mb-2">
                Ticket #{String(pendingTicket.ticket_number).padStart(3, '0')}
              </h3>
              <p className="text-white font-medium mb-4">
                Go to admin with your phone now!
              </p>
              <div className="bg-black/30 rounded-lg p-4 mx-4">
                <p className="text-slate-300 text-sm">
                  1. Find the admin (Yarik)<br />
                  2. Pick a paper from the hat<br />
                  3. Admin enters your prize<br />
                  4. You get your reward instantly!
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* How It Works */}
        <Card className="mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span className="text-xl">🎪</span>
            How It Works
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">1</span>
              <span className="text-slate-300">Buy a lottery ticket ({LOTTERY_COST}🪙)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">2</span>
              <span className="text-slate-300">Go to admin with your phone</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">3</span>
              <span className="text-slate-300">Pick a paper from the hat</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">4</span>
              <span className="text-slate-300">Admin enters prize → You win instantly!</span>
            </div>
          </div>
        </Card>

        {/* Prize Pool */}
        <Card className="mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span className="text-xl">🎁</span>
            Prize Pool
          </h3>
          <div className="space-y-3">
            {prizeCategories.map((cat) => (
              <div key={cat.name} className="flex items-start gap-3">
                <span className="text-2xl">{cat.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{cat.name}</span>
                    <Badge size="sm" variant="purple">{cat.chance}</Badge>
                  </div>
                  <p className="text-slate-400 text-sm">{cat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Buy Ticket */}
        <Card variant="highlight" className="text-center mb-6">
          <p className="text-slate-400 mb-2">Ticket Price:</p>
          <p className="text-coin-gold text-3xl font-bold mb-4">{LOTTERY_COST}🪙</p>

          <Button
            variant="gold"
            size="lg"
            fullWidth
            onClick={handleBuyTicket}
            loading={isBuying}
            disabled={!canBuy}
          >
            {pendingTicket ? '🎫 Go to Admin!' : '🎟️ BUY TICKET'}
          </Button>

          <p className="text-slate-500 text-sm mt-3">
            Your balance: {user?.balance || 0}🪙
          </p>

          {pendingTicket && (
            <p className="text-yellow-400 text-sm mt-2">
              Complete your current ticket first!
            </p>
          )}
        </Card>

        {/* Ticket History */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            YOUR TICKETS
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : tickets.length > 0 ? (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className={cn(
                    'flex items-center justify-between',
                    ticket.status === 'claimed' && 'border-green-500/50 bg-green-500/10',
                    ticket.status === 'pending' && 'border-yellow-500/50 bg-yellow-500/10'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎟️</span>
                    <div>
                      <span className="text-white font-mono font-bold text-lg">
                        #{String(ticket.ticket_number).padStart(3, '0')}
                      </span>
                      {ticket.prize_description && (
                        <p className="text-green-400 text-sm">{ticket.prize_description}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      ticket.status === 'claimed' ? 'green' :
                      ticket.status === 'pending' ? 'coin' : 'purple'
                    }
                    size="sm"
                  >
                    {ticket.status === 'claimed' ? '🎉 Won!' :
                     ticket.status === 'pending' ? '⏳ Pending' : 'Active'}
                  </Badge>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center text-slate-400 py-8">
              No tickets yet. Buy one to try your luck!
            </Card>
          )}
        </div>
      </PageWrapper>
    </>
  )
}
