import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { cn } from '../lib/utils'

/**
 * GroupGameRoom - V3.0
 * Dedicated page for game room with waiting room, playing, and finished states
 */
export default function GroupGameRoom() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const { user, updateBalance } = useUserStore()
  const { showToast } = useUIStore()

  const [game, setGame] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWinner, setSelectedWinner] = useState(null)
  const [processingAction, setProcessingAction] = useState(false)

  // Computed values
  const isHost = game?.creator_id === user?.id
  const myPlayer = players.find(p => p.user_id === user?.id)
  const allReady = players.length >= 2 && players.every(p => p.ready)
  const winner = players.find(p => p.user_id === game?.winner_id)

  // Load game data
  const loadGame = useCallback(async () => {
    const { data, error } = await supabase
      .from('group_games')
      .select(`
        *,
        creator:creator_id(id, name),
        winner:winner_id(id, name),
        players:group_game_players(
          id,
          user_id,
          ready,
          user:user_id(id, name)
        )
      `)
      .eq('id', gameId)
      .single()

    if (error || !data) {
      showToast('error', 'Game not found')
      navigate('/group-games')
      return
    }

    setGame(data)
    setPlayers(data.players || [])
    setLoading(false)
  }, [gameId, navigate, showToast])

  // Initial load and real-time subscription
  useEffect(() => {
    loadGame()

    const channel = supabase
      .channel(`game_room_${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_games', filter: `id=eq.${gameId}` },
        () => loadGame()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_game_players', filter: `game_id=eq.${gameId}` },
        () => loadGame()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, loadGame])

  // Toggle ready status
  async function toggleReady() {
    if (!myPlayer || processingAction) return

    setProcessingAction(true)
    await supabase
      .from('group_game_players')
      .update({ ready: !myPlayer.ready })
      .eq('id', myPlayer.id)

    setProcessingAction(false)
  }

  // Start game (host only)
  async function startGame() {
    if (!isHost || !allReady || processingAction) return

    setProcessingAction(true)
    await supabase
      .from('group_games')
      .update({ status: 'playing' })
      .eq('id', gameId)

    showToast('success', 'Game started! Play in person, then pick the winner.')
    setProcessingAction(false)
  }

  // Leave game (with refund)
  async function leaveGame() {
    if (!myPlayer || processingAction) return

    if (!confirm('Leave game? You will lose your buy-in!')) return

    setProcessingAction(true)

    // Remove player
    await supabase
      .from('group_game_players')
      .delete()
      .eq('id', myPlayer.id)

    // Update pot
    await supabase
      .from('group_games')
      .update({ pot: game.pot - game.buy_in })
      .eq('id', gameId)

    showToast('info', 'Left the game')
    navigate('/group-games')
  }

  // Cancel game (host only, refund all)
  async function cancelGame() {
    if (!isHost || processingAction) return

    if (!confirm('Cancel game? All players will be refunded.')) return

    setProcessingAction(true)

    // Refund all players
    for (const player of players) {
      const { data: userData } = await supabase
        .from('users')
        .select('balance')
        .eq('id', player.user_id)
        .single()

      const newBalance = (userData?.balance || 0) + game.buy_in
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', player.user_id)

      // If refunding self, update local state
      if (player.user_id === user.id) {
        updateBalance(newBalance)
      }
    }

    // Mark game as cancelled
    await supabase
      .from('group_games')
      .update({ status: 'cancelled' })
      .eq('id', gameId)

    showToast('success', 'Game cancelled. All players refunded!')
    navigate('/group-games')
  }

  // Select winner (host only)
  async function confirmWinner() {
    if (!isHost || !selectedWinner || processingAction) return

    setProcessingAction(true)

    // Award pot to winner
    const { data: winnerData } = await supabase
      .from('users')
      .select('balance')
      .eq('id', selectedWinner)
      .single()

    const newWinnerBalance = (winnerData?.balance || 0) + game.pot
    await supabase
      .from('users')
      .update({ balance: newWinnerBalance })
      .eq('id', selectedWinner)

    // If winner is self, update local state
    if (selectedWinner === user.id) {
      updateBalance(newWinnerBalance)
    }

    // Update game status
    await supabase
      .from('group_games')
      .update({ status: 'finished', winner_id: selectedWinner })
      .eq('id', gameId)

    // Create transaction
    await supabase.from('transactions').insert({
      to_user_id: selectedWinner,
      amount: game.pot,
      type: 'game_win',
      description: `Won ${game.name} game!`
    })

    // Notify winner
    await supabase.from('notifications').insert({
      user_id: selectedWinner,
      type: 'admin_message',
      title: '🎮 You Won!',
      message: `You won ${game.pot} coins in ${game.name}!`,
      data: { game_id: game.id, amount: game.pot, notification_type: 'game_win' }
    })

    showToast('success', 'Winner selected! Pot distributed!')
    setProcessingAction(false)
  }

  // Copy share link
  function copyShareLink() {
    const link = `${window.location.origin}/group-games/${gameId}`
    navigator.clipboard.writeText(link)
    showToast('success', 'Link copied!')
  }

  if (loading) {
    return (
      <PageWrapper title="Loading...">
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      </PageWrapper>
    )
  }

  if (!game) return null

  // ==========================================
  // RENDER BASED ON GAME STATUS
  // ==========================================

  // STATUS: WAITING FOR PLAYERS
  if (game.status === 'waiting') {
    return (
      <PageWrapper title={game.name}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/group-games')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <div className="text-coin-gold font-bold">{user?.balance}🪙</div>
          </div>

          {/* Status Card */}
          <Card className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-purple-500/40 text-center p-6">
            {isHost ? (
              <div className="text-lg font-bold text-white mb-2">👑 YOU ARE THE HOST</div>
            ) : (
              <div className="text-lg font-bold text-white mb-2">🎮 GAME LOBBY</div>
            )}
            <div className="text-slate-300">Status: WAITING FOR PLAYERS</div>
            <div className="text-3xl font-bold text-coin-gold mt-4">
              Pot: {game.pot}🪙
            </div>
          </Card>

          {/* Players List */}
          <Card>
            <h2 className="text-white font-semibold mb-4">
              PLAYERS ({players.length})
            </h2>
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-slate-800 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white">
                      👤 {player.user?.name || 'Unknown'}
                      {player.user_id === game.creator_id && ' 👑'}
                      {player.user_id === user.id && ' (You)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-coin-gold">{game.buy_in}🪙</span>
                    {player.ready ? (
                      <span className="text-green-400 text-sm">✅ Ready</span>
                    ) : (
                      <span className="text-yellow-400 text-sm">⏳ Not Ready</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Ready Button */}
            {myPlayer && (
              <Button
                onClick={toggleReady}
                disabled={processingAction}
                variant={myPlayer.ready ? 'success' : 'primary'}
                fullWidth
                size="lg"
              >
                {myPlayer.ready ? '✅ YOU ARE READY' : '✅ I\'M READY'}
              </Button>
            )}

            {/* Unready Button */}
            {myPlayer?.ready && (
              <Button
                onClick={toggleReady}
                disabled={processingAction}
                variant="secondary"
                fullWidth
              >
                🔄 Unready
              </Button>
            )}

            {/* Start Button (host only) */}
            {isHost && (
              <Button
                onClick={startGame}
                disabled={!allReady || processingAction}
                variant="success"
                fullWidth
                size="lg"
                className={cn(
                  !allReady && 'opacity-50 cursor-not-allowed'
                )}
              >
                {players.length < 2
                  ? '⏳ Need at least 2 players'
                  : !allReady
                  ? '⏳ Waiting for all players to be ready...'
                  : '🎮 START GAME'}
              </Button>
            )}

            {/* Leave/Cancel Buttons */}
            {isHost ? (
              <Button
                onClick={cancelGame}
                disabled={processingAction}
                variant="danger"
                fullWidth
              >
                ❌ Cancel Game (Refund All)
              </Button>
            ) : myPlayer ? (
              <Button
                onClick={leaveGame}
                disabled={processingAction}
                variant="danger"
                fullWidth
              >
                ❌ Leave Game
              </Button>
            ) : null}
          </div>

          {/* Share Link */}
          <Card className="p-4">
            <p className="text-slate-400 text-sm mb-2">Share this link to invite players:</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${window.location.origin}/group-games/${gameId}`}
                className="flex-1 bg-slate-800 text-white px-3 py-2 rounded-lg text-sm"
              />
              <Button onClick={copyShareLink} size="sm">
                📋 Copy
              </Button>
            </div>
          </Card>
        </div>
      </PageWrapper>
    )
  }

  // STATUS: PLAYING
  if (game.status === 'playing') {
    return (
      <PageWrapper title={game.name}>
        <div className="space-y-6">
          {/* Playing Card */}
          <Card className="bg-gradient-to-r from-green-600/30 to-emerald-600/30 border-green-500/40 text-center p-8">
            <div className="text-6xl mb-4">🎮</div>
            <div className="text-2xl font-bold text-white mb-2">GAME IN PROGRESS</div>
            <div className="text-4xl font-bold text-coin-gold my-4">Pot: {game.pot}🪙</div>
            <div className="text-green-200">Winner takes all!</div>
          </Card>

          {/* Instructions */}
          <Card className="text-center p-6">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-white text-lg mb-2">Play the real game now!</p>
            <p className="text-slate-400">
              {isHost
                ? 'When done, select the winner below.'
                : 'Host will select the winner when the game is done.'}
            </p>
          </Card>

          {/* Players */}
          <Card>
            <h2 className="text-white font-semibold mb-3">PLAYERS:</h2>
            <ul className="space-y-1">
              {players.map((p) => (
                <li key={p.id} className="text-slate-300">
                  • {p.user?.name} {p.user_id === game.creator_id && '(Host)'}
                </li>
              ))}
            </ul>
          </Card>

          {/* Host: Select Winner */}
          {isHost && (
            <Card>
              <h2 className="text-white font-semibold mb-4">👑 SELECT WINNER:</h2>
              <div className="space-y-2 mb-4">
                {players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedWinner(p.user_id)}
                    className={cn(
                      'w-full p-4 rounded-lg flex items-center justify-between transition-all',
                      selectedWinner === p.user_id
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-purple-600/20'
                    )}
                  >
                    <span>{selectedWinner === p.user_id ? '●' : '○'} {p.user?.name}</span>
                    {selectedWinner === p.user_id && <span>✓</span>}
                  </button>
                ))}
              </div>

              <Button
                onClick={confirmWinner}
                disabled={!selectedWinner || processingAction}
                variant="success"
                fullWidth
                size="lg"
              >
                🏆 CONFIRM WINNER & END GAME
              </Button>
            </Card>
          )}

          {/* Non-host: Wait message */}
          {!isHost && (
            <Card className="text-center p-6">
              <p className="text-yellow-400 italic">
                Waiting for host to select the winner...
              </p>
            </Card>
          )}
        </div>
      </PageWrapper>
    )
  }

  // STATUS: FINISHED
  if (game.status === 'finished' || game.status === 'cancelled') {
    return (
      <PageWrapper title={game.name}>
        <div className="space-y-6 text-center">
          {game.status === 'finished' ? (
            <>
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-3xl font-bold text-white">GAME FINISHED!</h1>

              {/* Winner Card */}
              <Card className="bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-yellow-500/40 p-8">
                <div className="text-xl text-yellow-200 mb-2">🏆 WINNER 🏆</div>
                <div className="text-3xl font-bold text-white">
                  {winner?.user?.name || game.winner?.name || 'Unknown'}
                </div>
                <div className="text-2xl text-coin-gold mt-4">
                  Won {game.pot}🪙!
                </div>
              </Card>

              {/* Final Standings */}
              <Card className="text-left">
                <h2 className="text-white font-semibold mb-3">FINAL STANDINGS:</h2>
                <div className="space-y-2">
                  {players.map((p) => (
                    <div key={p.id} className="flex justify-between text-slate-300">
                      <span>
                        {p.user_id === game.winner_id ? '🥇' : '🥈'} {p.user?.name}
                      </span>
                      <span className={p.user_id === game.winner_id ? 'text-green-400' : 'text-red-400'}>
                        {p.user_id === game.winner_id ? `+${game.pot}🪙` : `-${game.buy_in}🪙`}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-3xl font-bold text-white">GAME CANCELLED</h1>
              <p className="text-slate-400">All players have been refunded.</p>
            </>
          )}

          <Button
            onClick={() => navigate('/group-games')}
            fullWidth
            size="lg"
          >
            BACK TO GAMES
          </Button>
        </div>
      </PageWrapper>
    )
  }

  return null
}
