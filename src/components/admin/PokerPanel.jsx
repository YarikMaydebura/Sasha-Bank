import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { Input } from '../ui/Input'
import { supabase } from '../../lib/supabase'
import { useUIStore } from '../../stores/uiStore'
import { cn } from '../../lib/utils'

export function PokerPanel() {
  const [currentRound, setCurrentRound] = useState(null)
  const [players, setPlayers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [selectedWinners, setSelectedWinners] = useState([])
  const [minBuyIn, setMinBuyIn] = useState(3)

  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    fetchPokerData()

    // Real-time subscription
    const channel = supabase
      .channel('poker-admin')
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

  const handleCreateRound = async () => {
    setIsCreating(true)

    try {
      // Get highest round number
      const { data: lastRound } = await supabase
        .from('poker_rounds')
        .select('round_number')
        .order('round_number', { ascending: false })
        .limit(1)
        .single()

      const roundNumber = (lastRound?.round_number || 0) + 1

      const { error } = await supabase.from('poker_rounds').insert({
        round_number: roundNumber,
        status: 'open',
        pot_total: 0,
        min_buy_in: minBuyIn,
        max_players: 10,
      })

      if (error) throw error

      showToast('success', `Poker Round #${roundNumber} created!`)
      fetchPokerData()
    } catch (error) {
      console.error('Error creating round:', error)
      showToast('error', 'Failed to create round')
    } finally {
      setIsCreating(false)
    }
  }

  const handleLockRound = async () => {
    if (!currentRound) return

    setIsLocking(true)

    try {
      await supabase
        .from('poker_rounds')
        .update({
          status: 'playing',
          started_at: new Date().toISOString(),
        })
        .eq('id', currentRound.id)

      showToast('success', 'Round locked and started!')
      fetchPokerData()
    } catch (error) {
      console.error('Error locking round:', error)
      showToast('error', 'Failed to lock round')
    } finally {
      setIsLocking(false)
    }
  }

  const toggleWinner = (playerId) => {
    setSelectedWinners((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    )
  }

  const handleEndRound = async () => {
    if (!currentRound || selectedWinners.length === 0) {
      showToast('error', 'Please select at least one winner')
      return
    }

    setIsEnding(true)

    try {
      const pot = currentRound.pot_total || 0
      const winnersCount = selectedWinners.length
      const mainWinnerShare = Math.floor(pot * 0.7)
      const otherWinnerShare = Math.floor((pot - mainWinnerShare) / Math.max(1, winnersCount - 1))

      // Update all players
      for (let i = 0; i < players.length; i++) {
        const player = players[i]
        const isWinner = selectedWinners.includes(player.id)
        const isMainWinner = i === 0 && isWinner // First selected winner gets 70%

        let winnings = 0
        if (isMainWinner) {
          winnings = mainWinnerShare
        } else if (isWinner) {
          winnings = otherWinnerShare
        }

        // Update player status and winnings
        await supabase
          .from('poker_players')
          .update({
            status: isWinner ? 'winner' : 'loser',
            winnings: winnings,
          })
          .eq('id', player.id)

        // Award coins to winners
        if (isWinner && winnings > 0) {
          const { data: userData } = await supabase
            .from('users')
            .select('balance')
            .eq('id', player.user_id)
            .single()

          await supabase
            .from('users')
            .update({ balance: (userData.balance || 0) + winnings })
            .eq('id', player.user_id)

          await supabase.from('transactions').insert({
            to_user_id: player.user_id,
            amount: winnings,
            type: 'poker_win',
            description: `Poker winnings (${winnings} coins)`,
          })

          // Notify winner
          await supabase.from('notifications').insert({
            user_id: player.user_id,
            type: 'poker_win',
            title: '🏆 Poker Winner!',
            message: `Congratulations! You won ${winnings} coins from poker!`,
            data: {
              round_id: currentRound.id,
              winnings: winnings,
            },
          })
        }
      }

      // End round
      await supabase
        .from('poker_rounds')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          winners: selectedWinners.map((id) => {
            const player = players.find((p) => p.id === id)
            return {
              player_id: id,
              user_id: player.user_id,
              user_name: player.users.name,
            }
          }),
        })
        .eq('id', currentRound.id)

      showToast('success', `Round ended! ${winnersCount} winner(s) awarded!`)
      setSelectedWinners([])
      fetchPokerData()
    } catch (error) {
      console.error('Error ending round:', error)
      showToast('error', 'Failed to end round')
    } finally {
      setIsEnding(false)
    }
  }

  const activePlayers = players.filter((p) => p.status === 'playing')

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create New Round */}
      {!currentRound && (
        <Card className="bg-gradient-to-br from-green-500/20 to-blue-500/20 border-green-500/30">
          <h3 className="text-white font-bold text-lg mb-4">Create New Poker Round</h3>

          <Input
            label="Minimum Buy-In"
            type="number"
            value={minBuyIn}
            onChange={(e) => setMinBuyIn(parseInt(e.target.value) || 3)}
            min={1}
            className="mb-4"
          />

          <Button
            variant="success"
            size="lg"
            fullWidth
            onClick={handleCreateRound}
            loading={isCreating}
          >
            🎰 CREATE POKER ROUND
          </Button>
        </Card>
      )}

      {/* Current Round Management */}
      {currentRound && (
        <>
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">
                Round #{currentRound.round_number}
              </h3>
              <Badge
                variant={
                  currentRound.status === 'open'
                    ? 'success'
                    : currentRound.status === 'playing'
                    ? 'purple'
                    : 'secondary'
                }
              >
                {currentRound.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-slate-400 text-xs mb-1">Pot</p>
                <p className="text-coin-gold text-2xl font-bold">
                  {currentRound.pot_total}🪙
                </p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-xs mb-1">Players</p>
                <p className="text-white text-2xl font-bold">{players.length}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-xs mb-1">Min Buy-In</p>
                <p className="text-white text-2xl font-bold">{currentRound.min_buy_in}🪙</p>
              </div>
            </div>

            <div className="space-y-2">
              {currentRound.status === 'open' && (
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleLockRound}
                  loading={isLocking}
                  disabled={players.length < 2}
                >
                  🔒 LOCK & START ROUND
                </Button>
              )}

              {currentRound.status === 'playing' && (
                <>
                  <p className="text-slate-400 text-sm mb-3 text-center">
                    Select winner(s) to end the round
                  </p>
                  <Button
                    variant="success"
                    fullWidth
                    onClick={handleEndRound}
                    loading={isEnding}
                    disabled={selectedWinners.length === 0}
                  >
                    🏆 END ROUND ({selectedWinners.length} winner{selectedWinners.length !== 1 && 's'})
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Players List */}
          <Card>
            <h3 className="text-white font-semibold mb-4">
              Players ({players.length})
            </h3>

            {players.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                No players yet. Waiting for players to join...
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    onClick={() => {
                      if (currentRound.status === 'playing' && player.status === 'playing') {
                        toggleWinner(player.id)
                      }
                    }}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg transition-all',
                      currentRound.status === 'playing' && player.status === 'playing'
                        ? 'cursor-pointer hover:bg-white/10'
                        : '',
                      selectedWinners.includes(player.id)
                        ? 'bg-coin-gold/20 border-2 border-coin-gold/50'
                        : 'bg-white/5 border-2 border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {selectedWinners.includes(player.id) && '🏆'}
                        {!selectedWinners.includes(player.id) && player.status === 'playing' && '🎴'}
                        {player.status === 'folded' && '❌'}
                      </span>
                      <div>
                        <p className="text-white font-medium">
                          {player.users?.name}
                          {index === 0 && selectedWinners.includes(player.id) && (
                            <span className="text-coin-gold text-xs ml-2">(70%)</span>
                          )}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {player.chips_in} chips
                          {player.status === 'folded' && ' • Folded'}
                        </p>
                      </div>
                    </div>

                    {selectedWinners.includes(player.id) && (
                      <Badge variant="coin" size="sm">
                        WINNER
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {currentRound.status === 'playing' && activePlayers.length > 0 && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 text-xs text-center">
                  💡 Tap on players to select winner(s). First selected gets 70%, others split 30%.
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
