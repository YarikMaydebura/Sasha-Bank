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

export function Lottery() {
  const [tickets, setTickets] = useState([])
  const [nextNumber, setNextNumber] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isBuying, setIsBuying] = useState(false)

  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    fetchTickets()
  }, [user?.id])

  const fetchTickets = async () => {
    if (!user?.id) return

    try {
      // Get user's tickets
      const { data: userTickets, error } = await supabase
        .from('lottery_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('ticket_number', { ascending: true })

      if (error) throw error
      setTickets(userTickets || [])

      // Get next available ticket number
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

    if (user.balance < CONSTANTS.LOTTERY_COST) {
      showToast('error', "Not enough coins!")
      return
    }

    setIsBuying(true)

    try {
      // Deduct cost
      const newBalance = user.balance - CONSTANTS.LOTTERY_COST
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      // Create ticket
      const { data: ticket, error } = await supabase
        .from('lottery_tickets')
        .insert({
          user_id: user.id,
          ticket_number: nextNumber,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error

      // Log transaction
      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: CONSTANTS.LOTTERY_COST,
        type: 'lottery_ticket',
        description: `Lottery ticket #${ticket.ticket_number}`,
      })

      updateBalance(newBalance)
      showToast('success', `🎟️ You got ticket #${ticket.ticket_number}!`)
      fetchTickets()
    } catch (error) {
      console.error('Error buying ticket:', error)
      showToast('error', 'Failed to buy ticket')
    } finally {
      setIsBuying(false)
    }
  }

  const canBuy = (user?.balance || 0) >= CONSTANTS.LOTTERY_COST

  return (
    <>
      <Header title="Lottery" showBack showBalance />

      <PageWrapper className="pt-0">
        <div className="text-center py-8">
          <span className="text-6xl block mb-4">🎰</span>
          <h2 className="text-2xl font-bold text-white mb-2">
            SASHA LOTTERY
          </h2>
          <div className="h-0.5 w-16 bg-pastel-purple mx-auto my-4" />
        </div>

        {/* Important Info */}
        <Card className="mb-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl">🎪</span>
            <div>
              <h3 className="text-white font-semibold mb-1">
                Physical Bucket Draw!
              </h3>
              <p className="text-slate-300 text-sm">
                All ticket numbers go into a physical bucket. At the end of the party, winners will be drawn live!
              </p>
            </div>
          </div>
        </Card>

        {/* Prizes info */}
        <Card className="mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span className="text-xl">🎁</span>
            Prize Pool
          </h3>
          <div className="space-y-3">
            {/* Coin Prizes */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">💰</span>
                <span className="text-slate-300 font-medium">Bonus Coins</span>
              </div>
              <div className="text-slate-400 text-sm ml-7">
                +10, +20, +50, or +100 coins
              </div>
            </div>

            {/* Card Prizes */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🃏</span>
                <span className="text-slate-300 font-medium">Collectible Cards</span>
              </div>
              <div className="text-slate-400 text-sm ml-7">
                Random rarity: Common (50%), Rare (30%), Epic (15%), Legendary (5%)
              </div>
            </div>

            {/* Physical Prizes */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🎁</span>
                <span className="text-slate-300 font-medium">Physical Prizes</span>
              </div>
              <div className="text-slate-400 text-sm ml-7">
                Drinks, snacks, party favors, merchandise
              </div>
            </div>

            {/* Punishments */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">😈</span>
                <span className="text-slate-300 font-medium">Fun Challenges</span>
              </div>
              <div className="text-slate-400 text-sm ml-7">
                20 pushups, sing a song, Bean Boozle candy, take a shot
              </div>
            </div>
          </div>
        </Card>

        {/* Buy ticket */}
        <Card variant="highlight" className="text-center mb-6">
          <p className="text-slate-400 mb-2">Cost:</p>
          <p className="text-coin-gold text-3xl font-bold mb-4">
            {CONSTANTS.LOTTERY_COST}🪙
          </p>

          <Button
            variant="gold"
            size="lg"
            fullWidth
            onClick={handleBuyTicket}
            loading={isBuying}
            disabled={!canBuy}
          >
            🎟️ BUY TICKET
          </Button>

          <p className="text-slate-500 text-sm mt-3">
            Your balance: {user?.balance}🪙
          </p>
        </Card>

        {/* Your tickets */}
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
                    ticket.status === 'won' && 'border-coin-gold bg-coin-gold/10'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎟️</span>
                    <span className="text-white font-mono font-bold text-xl">
                      #{String(ticket.ticket_number).padStart(3, '0')}
                    </span>
                  </div>
                  <Badge
                    variant={ticket.status === 'won' ? 'coin' : 'purple'}
                    size="sm"
                  >
                    {ticket.status === 'won' ? '🏆 WINNER!' : 'Active'}
                  </Badge>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center text-slate-400 py-8">
              No tickets yet. Buy one to join the draw!
            </Card>
          )}
        </div>

        <Card className="mt-6 bg-purple-500/10 border-purple-500/30 text-center">
          <p className="text-purple-300 font-medium mb-2">
            🎉 Live Draw at End of Party!
          </p>
          <p className="text-slate-400 text-sm">
            All ticket numbers will be placed in a physical bucket. Winners will be drawn live during the final celebration!
          </p>
        </Card>
      </PageWrapper>
    </>
  )
}
