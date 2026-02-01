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
 * PokerRoom - V3.0
 * Dedicated page for poker table with waiting room, playing, and finished states
 */
export default function PokerRoom() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { user, updateBalance } = useUserStore()
  const { showToast } = useUIStore()

  const [table, setTable] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWinner, setSelectedWinner] = useState(null)
  const [processingAction, setProcessingAction] = useState(false)
  const [raiseAmount, setRaiseAmount] = useState(1)

  // Computed values
  const isHost = table?.creator_id === user?.id
  const myPlayer = players.find(p => p.user_id === user?.id)
  const allReady = players.length >= 2 && players.every(p => p.ready)
  const winner = players.find(p => p.user_id === table?.winner_id)

  // Load table data
  const loadTable = useCallback(async () => {
    const { data, error } = await supabase
      .from('poker_tables')
      .select(`
        *,
        creator:creator_id(id, name),
        winner:winner_id(id, name),
        players:poker_players(
          id,
          user_id,
          buy_in,
          stack,
          ready,
          folded,
          user:user_id(id, name)
        )
      `)
      .eq('id', tableId)
      .single()

    if (error || !data) {
      showToast('error', 'Table not found')
      navigate('/poker')
      return
    }

    setTable(data)
    setPlayers(data.players || [])
    setLoading(false)
  }, [tableId, navigate, showToast])

  // Initial load and real-time subscription
  useEffect(() => {
    loadTable()

    const channel = supabase
      .channel(`poker_room_${tableId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poker_tables', filter: `id=eq.${tableId}` },
        () => loadTable()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poker_players', filter: `table_id=eq.${tableId}` },
        () => loadTable()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableId, loadTable])

  // Toggle ready status
  async function toggleReady() {
    if (!myPlayer || processingAction) return

    setProcessingAction(true)
    await supabase
      .from('poker_players')
      .update({ ready: !myPlayer.ready })
      .eq('id', myPlayer.id)

    setProcessingAction(false)
  }

  // Start game (host only)
  async function startGame() {
    if (!isHost || !allReady || processingAction) return

    setProcessingAction(true)
    await supabase
      .from('poker_tables')
      .update({ status: 'playing' })
      .eq('id', tableId)

    showToast('success', 'Game started! Play in person, then pick the winner.')
    setProcessingAction(false)
  }

  // Leave table
  async function leaveTable() {
    if (!myPlayer || processingAction) return

    if (!confirm('Leave table? You will lose your buy-in!')) return

    setProcessingAction(true)

    // Remove player
    await supabase
      .from('poker_players')
      .delete()
      .eq('id', myPlayer.id)

    // Update pot
    await supabase
      .from('poker_tables')
      .update({ pot: table.pot - myPlayer.buy_in })
      .eq('id', tableId)

    showToast('info', 'Left the table')
    navigate('/poker')
  }

  // Cancel table (host only, refund all)
  async function cancelTable() {
    if (!isHost || processingAction) return

    if (!confirm('Cancel table? All players will be refunded.')) return

    setProcessingAction(true)

    // Refund all players
    for (const player of players) {
      const { data: userData } = await supabase
        .from('users')
        .select('balance')
        .eq('id', player.user_id)
        .single()

      const newBalance = (userData?.balance || 0) + player.buy_in
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', player.user_id)

      if (player.user_id === user.id) {
        updateBalance(newBalance)
      }
    }

    // Mark table as cancelled
    await supabase
      .from('poker_tables')
      .update({ status: 'cancelled' })
      .eq('id', tableId)

    showToast('success', 'Table cancelled. All players refunded!')
    navigate('/poker')
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

    const newWinnerBalance = (winnerData?.balance || 0) + table.pot
    await supabase
      .from('users')
      .update({ balance: newWinnerBalance })
      .eq('id', selectedWinner)

    if (selectedWinner === user.id) {
      updateBalance(newWinnerBalance)
    }

    // Update table status
    await supabase
      .from('poker_tables')
      .update({ status: 'finished', winner_id: selectedWinner })
      .eq('id', tableId)

    // Create transaction
    await supabase.from('transactions').insert({
      to_user_id: selectedWinner,
      amount: table.pot,
      type: 'poker_win',
      description: `Won poker table: ${table.name}!`
    })

    // Notify winner
    await supabase.from('notifications').insert({
      user_id: selectedWinner,
      type: 'admin_message',
      title: '🃏 Poker Win!',
      message: `You won ${table.pot} coins in poker!`,
      data: { table_id: table.id, amount: table.pot, notification_type: 'poker_win' }
    })

    showToast('success', 'Winner selected! Pot distributed!')
    setProcessingAction(false)
  }

  // Handle raise with custom amount
  async function handleRaise() {
    if (!myPlayer || processingAction || raiseAmount < 1 || raiseAmount > myPlayer.stack) return
    await handleQuickRaise(raiseAmount)
  }

  // Quick raise with specific amount
  async function handleQuickRaise(amount) {
    if (!myPlayer || processingAction || amount > myPlayer.stack || myPlayer.folded) return

    setProcessingAction(true)

    // Update player stack
    const newStack = myPlayer.stack - amount
    await supabase
      .from('poker_players')
      .update({ stack: newStack })
      .eq('id', myPlayer.id)

    // Update pot
    await supabase
      .from('poker_tables')
      .update({ pot: table.pot + amount })
      .eq('id', tableId)

    // Update user's actual balance
    const newBalance = user.balance - amount
    await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', user.id)
    updateBalance(newBalance)

    showToast('success', `Raised ${amount}🪙!`)
    setRaiseAmount(1)
    setProcessingAction(false)
  }

  // All-in - bet everything
  async function handleAllIn() {
    if (!myPlayer || processingAction || myPlayer.stack === 0 || myPlayer.folded) return
    await handleQuickRaise(myPlayer.stack)
    showToast('info', '🔥 ALL IN!')
  }

  // Fold - give up
  async function handleFold() {
    if (!myPlayer || processingAction || myPlayer.folded) return

    if (!confirm('Fold? You will lose your current bet.')) return

    setProcessingAction(true)

    await supabase
      .from('poker_players')
      .update({ folded: true })
      .eq('id', myPlayer.id)

    showToast('info', 'You folded.')
    setProcessingAction(false)
  }

  // Copy share link
  function copyShareLink() {
    const link = `${window.location.origin}/poker/${tableId}`
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

  if (!table) return null

  // ==========================================
  // RENDER BASED ON TABLE STATUS
  // ==========================================

  // STATUS: WAITING FOR PLAYERS
  if (table.status === 'waiting') {
    return (
      <PageWrapper title={table.name}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/poker')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <div className="text-coin-gold font-bold">{user?.balance}🪙</div>
          </div>

          {/* Status Card */}
          <Card className="bg-gradient-to-r from-green-600/30 to-emerald-600/30 border-green-500/40 text-center p-6">
            {isHost ? (
              <div className="text-lg font-bold text-white mb-2">👑 YOU ARE THE HOST</div>
            ) : (
              <div className="text-lg font-bold text-white mb-2">🃏 POKER TABLE</div>
            )}
            <div className="text-slate-300">Status: WAITING FOR PLAYERS</div>
            <div className="text-3xl font-bold text-coin-gold mt-4">
              Pot: {table.pot}🪙
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
                      🃏 {player.user?.name || 'Unknown'}
                      {player.user_id === table.creator_id && ' 👑'}
                      {player.user_id === user.id && ' (You)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-coin-gold">{player.stack}🪙</span>
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
                  : '🃏 START GAME'}
              </Button>
            )}

            {/* Leave/Cancel Buttons */}
            {isHost ? (
              <Button
                onClick={cancelTable}
                disabled={processingAction}
                variant="danger"
                fullWidth
              >
                ❌ Cancel Table (Refund All)
              </Button>
            ) : myPlayer ? (
              <Button
                onClick={leaveTable}
                disabled={processingAction}
                variant="danger"
                fullWidth
              >
                ❌ Leave Table
              </Button>
            ) : null}
          </div>

          {/* Share Link */}
          <Card className="p-4">
            <p className="text-slate-400 text-sm mb-2">Share this link to invite players:</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${window.location.origin}/poker/${tableId}`}
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
  if (table.status === 'playing') {
    return (
      <PageWrapper title={table.name}>
        <div className="space-y-6">
          {/* Playing Card */}
          <Card className="bg-gradient-to-r from-green-600/30 to-emerald-600/30 border-green-500/40 text-center p-8">
            <div className="text-6xl mb-4">🃏</div>
            <div className="text-2xl font-bold text-white mb-2">POKER IN PROGRESS</div>
            <div className="text-4xl font-bold text-coin-gold my-4">Pot: {table.pot}🪙</div>
            <div className="text-green-200">Winner takes all!</div>
          </Card>

          {/* Instructions */}
          <Card className="text-center p-6">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-white text-lg mb-2">Play poker in person!</p>
            <p className="text-slate-400">
              {isHost
                ? 'When done, select the winner below.'
                : 'Host will select the winner when the game is done.'}
            </p>
          </Card>

          {/* Players */}
          <Card>
            <h2 className="text-white font-semibold mb-3">PLAYERS:</h2>
            <div className="space-y-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex justify-between items-center",
                    p.folded ? "text-slate-500 line-through" : "text-slate-300"
                  )}
                >
                  <span>
                    {p.folded ? '❌' : '🃏'} {p.user?.name} {p.user_id === table.creator_id && '(Host)'}
                    {p.folded && ' (Folded)'}
                  </span>
                  <span className={p.folded ? "text-slate-500" : "text-coin-gold"}>{p.stack}🪙</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Betting Actions - Show for active (non-folded) players */}
          {myPlayer && !myPlayer.folded && (
            <Card>
              <h2 className="text-white font-semibold mb-4">💰 YOUR ACTIONS:</h2>
              <div className="text-center mb-4">
                <div className="text-slate-400">Your Stack:</div>
                <div className="text-2xl font-bold text-coin-gold">{myPlayer.stack}🪙</div>
              </div>

              {/* Raise Input */}
              <div className="mb-4">
                <label className="text-slate-400 text-sm">Raise Amount:</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    min="1"
                    max={myPlayer.stack}
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(Math.min(Math.max(1, Number(e.target.value)), myPlayer.stack))}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  />
                  <Button onClick={handleRaise} disabled={processingAction || raiseAmount < 1 || myPlayer.stack < raiseAmount}>
                    📈 Raise
                  </Button>
                </div>
              </div>

              {/* Quick Bet Buttons */}
              <div className="flex gap-2 mb-4">
                {[1, 2, 5, 10].map(amt => (
                  <Button
                    key={amt}
                    onClick={() => handleQuickRaise(amt)}
                    disabled={processingAction || myPlayer.stack < amt}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    +{amt}🪙
                  </Button>
                ))}
              </div>

              {/* All-in & Fold */}
              <div className="flex gap-2">
                <Button
                  onClick={handleAllIn}
                  disabled={processingAction || myPlayer.stack === 0}
                  variant="secondary"
                  className="flex-1 bg-orange-600 hover:bg-orange-500"
                >
                  🔥 ALL-IN ({myPlayer.stack}🪙)
                </Button>
                <Button
                  onClick={handleFold}
                  disabled={processingAction}
                  variant="danger"
                  className="flex-1"
                >
                  ❌ FOLD
                </Button>
              </div>
            </Card>
          )}

          {/* Show if player folded */}
          {myPlayer?.folded && (
            <Card className="bg-red-900/30 border-red-500/40 text-center p-6">
              <div className="text-4xl mb-2">😢</div>
              <div className="text-red-300">You folded. Waiting for game to end...</div>
            </Card>
          )}

          {/* Host: Select Winner */}
          {isHost && (
            <Card>
              <h2 className="text-white font-semibold mb-4">👑 SELECT WINNER:</h2>
              <p className="text-slate-400 text-sm mb-3">Select the player who won the hand:</p>
              <div className="space-y-2 mb-4">
                {players.filter(p => !p.folded).map((p) => (
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
                {players.filter(p => p.folded).length > 0 && (
                  <div className="text-slate-500 text-sm mt-2 italic">
                    Folded: {players.filter(p => p.folded).map(p => p.user?.name).join(', ')}
                  </div>
                )}
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
  if (table.status === 'finished' || table.status === 'cancelled') {
    return (
      <PageWrapper title={table.name}>
        <div className="space-y-6 text-center">
          {table.status === 'finished' ? (
            <>
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-3xl font-bold text-white">GAME FINISHED!</h1>

              {/* Winner Card */}
              <Card className="bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-yellow-500/40 p-8">
                <div className="text-xl text-yellow-200 mb-2">🏆 WINNER 🏆</div>
                <div className="text-3xl font-bold text-white">
                  {winner?.user?.name || table.winner?.name || 'Unknown'}
                </div>
                <div className="text-2xl text-coin-gold mt-4">
                  Won {table.pot}🪙!
                </div>
              </Card>

              {/* Final Standings */}
              <Card className="text-left">
                <h2 className="text-white font-semibold mb-3">FINAL STANDINGS:</h2>
                <div className="space-y-2">
                  {players.map((p) => (
                    <div key={p.id} className="flex justify-between text-slate-300">
                      <span>
                        {p.user_id === table.winner_id ? '🥇' : '🥈'} {p.user?.name}
                      </span>
                      <span className={p.user_id === table.winner_id ? 'text-green-400' : 'text-red-400'}>
                        {p.user_id === table.winner_id ? `+${table.pot}🪙` : `-${p.buy_in}🪙`}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-3xl font-bold text-white">TABLE CANCELLED</h1>
              <p className="text-slate-400">All players have been refunded.</p>
            </>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="secondary"
              size="lg"
              className="flex-1"
            >
              🏠 HOME
            </Button>
            <Button
              onClick={() => navigate('/poker')}
              size="lg"
              className="flex-1"
            >
              🃏 PLAY AGAIN
            </Button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  return null
}
