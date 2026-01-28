import { useState, useEffect } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { Modal } from '../components/ui/Modal'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { cn } from '../lib/utils'

export function Poker() {
  const [currentRound, setCurrentRound] = useState(null)
  const [players, setPlayers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [isAddingChips, setIsAddingChips] = useState(false)
  const [isFolding, setIsFolding] = useState(false)
  const [showBuyInModal, setShowBuyInModal] = useState(false)
  const [showAddChipsModal, setShowAddChipsModal] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState(3)

  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    fetchPokerData()

    // Real-time subscription
    const channel = supabase
      .channel('poker-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poker_rounds',
        },
        () => {
          fetchPokerData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poker_players',
        },
        () => {
          fetchPokerData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchPokerData = async () => {
    try {
      // Get current active round
      const { data: round, error: roundError } = await supabase
        .from('poker_rounds')
        .select('*')
        .in('status', ['open', 'locked', 'playing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (roundError && roundError.code !== 'PGRST116') throw roundError

      setCurrentRound(round || null)

      if (round) {
        // Get players in this round
        const { data: playersData, error: playersError } = await supabase
          .from('poker_players')
          .select(`
            *,
            users (id, name)
          `)
          .eq('round_id', round.id)
          .order('joined_at', { ascending: true })

        if (playersError) throw playersError
        setPlayers(playersData || [])
      } else {
        setPlayers([])
      }
    } catch (error) {
      console.error('Error fetching poker data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const myPlayer = players.find((p) => p.user_id === user?.id)
  const canJoin = currentRound?.status === 'open' && !myPlayer && (user?.balance || 0) >= (currentRound?.min_buy_in || 3)
  const canAddChips = myPlayer && myPlayer.status === 'playing' && currentRound?.status !== 'ended'
  const canFold = myPlayer && myPlayer.status === 'playing' && currentRound?.status === 'playing'

  const handleJoinRound = async () => {
    if (!user || !currentRound) return

    if (user.balance < selectedAmount) {
      showToast('error', 'Not enough coins!')
      return
    }

    setIsJoining(true)

    try {
      // Deduct coins
      const newBalance = user.balance - selectedAmount
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      // Join round
      await supabase.from('poker_players').insert({
        round_id: currentRound.id,
        user_id: user.id,
        chips_in: selectedAmount,
        status: 'playing',
      })

      // Update pot
      await supabase
        .from('poker_rounds')
        .update({ pot_total: (currentRound.pot_total || 0) + selectedAmount })
        .eq('id', currentRound.id)

      // Log transaction
      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: selectedAmount,
        type: 'poker_buy_in',
        description: `Poker buy-in (${selectedAmount} chips)`,
      })

      updateBalance(newBalance)
      showToast('success', '🎰 Joined the poker round!')
      setShowBuyInModal(false)
      fetchPokerData()
    } catch (error) {
      console.error('Error joining round:', error)
      showToast('error', 'Failed to join round')
    } finally {
      setIsJoining(false)
    }
  }

  const handleAddChips = async () => {
    if (!user || !currentRound || !myPlayer) return

    if (user.balance < selectedAmount) {
      showToast('error', 'Not enough coins!')
      return
    }

    setIsAddingChips(true)

    try {
      // Deduct coins
      const newBalance = user.balance - selectedAmount
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      // Update player chips
      await supabase
        .from('poker_players')
        .update({ chips_in: myPlayer.chips_in + selectedAmount })
        .eq('id', myPlayer.id)

      // Update pot
      await supabase
        .from('poker_rounds')
        .update({ pot_total: (currentRound.pot_total || 0) + selectedAmount })
        .eq('id', currentRound.id)

      // Log transaction
      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: selectedAmount,
        type: 'poker_add_chips',
        description: `Added ${selectedAmount} chips to poker`,
      })

      updateBalance(newBalance)
      showToast('success', `Added ${selectedAmount} chips!`)
      setShowAddChipsModal(false)
      fetchPokerData()
    } catch (error) {
      console.error('Error adding chips:', error)
      showToast('error', 'Failed to add chips')
    } finally {
      setIsAddingChips(false)
    }
  }

  const handleFold = async () => {
    if (!myPlayer || !currentRound) return

    setIsFolding(true)

    try {
      await supabase
        .from('poker_players')
        .update({ status: 'folded' })
        .eq('id', myPlayer.id)

      showToast('success', 'You folded')
      fetchPokerData()
    } catch (error) {
      console.error('Error folding:', error)
      showToast('error', 'Failed to fold')
    } finally {
      setIsFolding(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Poker" showBack showBalance />
        <PageWrapper className="flex items-center justify-center">
          <Spinner size="lg" />
        </PageWrapper>
      </>
    )
  }

  return (
    <>
      <Header title="Poker" showBack showBalance />

      <PageWrapper className="pt-0">
        <div className="text-center py-8">
          <span className="text-6xl block mb-4">🃏</span>
          <h2 className="text-2xl font-bold text-white mb-2">POKER NIGHT</h2>
          <div className="h-0.5 w-16 bg-pastel-purple mx-auto my-4" />
        </div>

        {!currentRound ? (
          <Card className="text-center py-12">
            <span className="text-5xl block mb-4">💤</span>
            <p className="text-white font-semibold mb-2">No Active Round</p>
            <p className="text-slate-400 text-sm">
              Wait for an admin to start a new poker round
            </p>
          </Card>
        ) : (
          <>
            {/* Current Round Info */}
            <Card className="mb-6 bg-gradient-to-br from-green-500/20 to-blue-500/20 border-green-500/30">
              <div className="text-center mb-4">
                <Badge
                  variant={
                    currentRound.status === 'open'
                      ? 'success'
                      : currentRound.status === 'playing'
                      ? 'purple'
                      : 'secondary'
                  }
                  size="lg"
                >
                  {currentRound.status === 'open' && '🟢 JOIN NOW'}
                  {currentRound.status === 'locked' && '🔒 LOCKED'}
                  {currentRound.status === 'playing' && '🎲 IN PROGRESS'}
                </Badge>
              </div>

              <div className="text-center mb-4">
                <p className="text-slate-400 text-sm mb-1">Current Pot</p>
                <p className="text-coin-gold text-4xl font-bold">
                  {currentRound.pot_total || 0}🪙
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <p className="text-slate-400 text-xs mb-1">Players</p>
                  <p className="text-white text-xl font-bold">{players.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-xs mb-1">Min Buy-In</p>
                  <p className="text-white text-xl font-bold">{currentRound.min_buy_in}🪙</p>
                </div>
              </div>
            </Card>

            {/* My Status */}
            {myPlayer && (
              <Card className="mb-6 bg-purple-500/10 border-purple-500/30">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span>🎴</span>
                  Your Status
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Chips In</span>
                    <span className="text-coin-gold font-bold">{myPlayer.chips_in}🪙</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Status</span>
                    <Badge
                      variant={
                        myPlayer.status === 'playing'
                          ? 'success'
                          : myPlayer.status === 'winner'
                          ? 'coin'
                          : 'secondary'
                      }
                      size="sm"
                    >
                      {myPlayer.status === 'playing' && '🎲 Playing'}
                      {myPlayer.status === 'folded' && '❌ Folded'}
                      {myPlayer.status === 'winner' && '🏆 Winner'}
                      {myPlayer.status === 'loser' && '😔 Lost'}
                    </Badge>
                  </div>
                  {myPlayer.status === 'winner' && myPlayer.winnings > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-green-400 text-sm font-semibold">Winnings</span>
                      <span className="text-green-400 font-bold text-lg">
                        +{myPlayer.winnings}🪙
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              {canJoin && (
                <Button
                  variant="success"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    setSelectedAmount(currentRound.min_buy_in)
                    setShowBuyInModal(true)
                  }}
                >
                  🎰 JOIN ROUND
                </Button>
              )}

              {canAddChips && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setSelectedAmount(3)
                    setShowAddChipsModal(true)
                  }}
                >
                  ➕ ADD CHIPS
                </Button>
              )}

              {canFold && (
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={handleFold}
                  loading={isFolding}
                >
                  ❌ FOLD
                </Button>
              )}
            </div>

            {/* Players List */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Players ({players.length})
              </h3>

              <div className="space-y-2">
                {players.map((player) => (
                  <Card
                    key={player.id}
                    className={cn(
                      'flex items-center justify-between',
                      player.status === 'winner' && 'bg-coin-gold/10 border-coin-gold/30'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {player.status === 'winner' && '🏆'}
                        {player.status === 'playing' && '🎴'}
                        {player.status === 'folded' && '❌'}
                        {player.status === 'loser' && '😔'}
                      </span>
                      <div>
                        <p className="text-white font-medium">
                          {player.users?.name}
                          {player.user_id === user?.id && (
                            <span className="text-purple-400 text-sm ml-2">(You)</span>
                          )}
                        </p>
                        <p className="text-slate-400 text-sm">{player.chips_in} chips</p>
                      </div>
                    </div>

                    {player.status === 'winner' && player.winnings > 0 && (
                      <Badge variant="coin" size="sm">
                        +{player.winnings}🪙
                      </Badge>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </PageWrapper>

      {/* Buy-In Modal */}
      <Modal
        isOpen={showBuyInModal}
        onClose={() => setShowBuyInModal(false)}
        title="Join Poker Round"
      >
        <div className="space-y-4">
          <p className="text-slate-400">Select your buy-in amount:</p>

          <div className="grid grid-cols-4 gap-2">
            {[3, 5, 10, 15].map((amount) => (
              <button
                key={amount}
                onClick={() => setSelectedAmount(amount)}
                disabled={(user?.balance || 0) < amount}
                className={cn(
                  'px-4 py-3 rounded-lg border-2 transition-all',
                  selectedAmount === amount
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : (user?.balance || 0) < amount
                    ? 'border-white/10 bg-white/5 text-slate-600 cursor-not-allowed'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                )}
              >
                <span className="font-bold">{amount}🪙</span>
              </button>
            ))}
          </div>

          <p className="text-slate-500 text-sm">Your balance: {user?.balance}🪙</p>

          <div className="flex gap-3">
            <Button
              variant="success"
              fullWidth
              onClick={handleJoinRound}
              loading={isJoining}
              disabled={(user?.balance || 0) < selectedAmount}
            >
              Join with {selectedAmount}🪙
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setShowBuyInModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Chips Modal */}
      <Modal
        isOpen={showAddChipsModal}
        onClose={() => setShowAddChipsModal(false)}
        title="Add More Chips"
      >
        <div className="space-y-4">
          <p className="text-slate-400">Add more chips to the pot:</p>

          <div className="grid grid-cols-4 gap-2">
            {[3, 5, 10, 15].map((amount) => (
              <button
                key={amount}
                onClick={() => setSelectedAmount(amount)}
                disabled={(user?.balance || 0) < amount}
                className={cn(
                  'px-4 py-3 rounded-lg border-2 transition-all',
                  selectedAmount === amount
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                    : (user?.balance || 0) < amount
                    ? 'border-white/10 bg-white/5 text-slate-600 cursor-not-allowed'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                )}
              >
                <span className="font-bold">+{amount}🪙</span>
              </button>
            ))}
          </div>

          <p className="text-slate-500 text-sm">Your balance: {user?.balance}🪙</p>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={handleAddChips}
              loading={isAddingChips}
              disabled={(user?.balance || 0) < selectedAmount}
            >
              Add {selectedAmount}🪙
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setShowAddChipsModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
