import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'

const BUY_IN_OPTIONS = [1, 2, 3, 5, 10]

export default function GroupGames() {
  const { user, updateBalance } = useUserStore()
  const { showToast } = useUIStore()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGame, setNewGame] = useState({ name: '', buy_in: 3 })
  const [creating, setCreating] = useState(false)

  // Load games
  useEffect(() => {
    loadGames()

    // Subscribe to changes
    const channel = supabase
      .channel('group_games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_games' }, loadGames)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_game_players' }, loadGames)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadGames() {
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
      .in('status', ['open', 'started'])
      .order('created_at', { ascending: false })

    if (!error) {
      setGames(data || [])
    }
    setLoading(false)
  }

  async function createGame() {
    if (!newGame.name.trim()) {
      showToast('error', 'Please enter a game name')
      return
    }

    if (user.balance < newGame.buy_in) {
      showToast('error', 'Not enough coins!')
      return
    }

    setCreating(true)

    // Create game
    const { data: game, error } = await supabase
      .from('group_games')
      .insert({
        name: newGame.name.trim(),
        buy_in: newGame.buy_in,
        creator_id: user.id,
        pot: newGame.buy_in,
        status: 'open'
      })
      .select()
      .single()

    if (error) {
      showToast('error', 'Failed to create game')
      setCreating(false)
      return
    }

    // Join as first player
    await supabase.from('group_game_players').insert({
      game_id: game.id,
      user_id: user.id,
      ready: true
    })

    // Deduct buy-in
    const newBalance = user.balance - newGame.buy_in
    await supabase.from('users').update({ balance: newBalance }).eq('id', user.id)
    updateBalance(newBalance)

    // Create transaction
    await supabase.from('transactions').insert({
      from_user_id: user.id,
      amount: newGame.buy_in,
      type: 'game_buy_in',
      description: `Joined ${newGame.name} game`
    })

    showToast('success', 'Game created!')
    setShowCreateModal(false)
    setNewGame({ name: '', buy_in: 3 })
    setCreating(false)
  }

  async function joinGame(game) {
    if (user.balance < game.buy_in) {
      showToast('error', 'Not enough coins!')
      return
    }

    // Check if already joined
    const alreadyJoined = game.players?.some(p => p.user_id === user.id)
    if (alreadyJoined) {
      showToast('error', 'Already in this game!')
      return
    }

    // Join game
    await supabase.from('group_game_players').insert({
      game_id: game.id,
      user_id: user.id,
      ready: false
    })

    // Update pot
    const newPot = game.pot + game.buy_in
    await supabase.from('group_games').update({ pot: newPot }).eq('id', game.id)

    // Deduct buy-in
    const newBalance = user.balance - game.buy_in
    await supabase.from('users').update({ balance: newBalance }).eq('id', user.id)
    updateBalance(newBalance)

    // Create transaction
    await supabase.from('transactions').insert({
      from_user_id: user.id,
      amount: game.buy_in,
      type: 'game_buy_in',
      description: `Joined ${game.name} game`
    })

    showToast('success', 'Joined game!')
  }

  async function markReady(game) {
    const player = game.players?.find(p => p.user_id === user.id)
    if (!player) return

    await supabase
      .from('group_game_players')
      .update({ ready: !player.ready })
      .eq('id', player.id)

    showToast('success', player.ready ? 'Marked as not ready' : 'Marked as ready!')
  }

  async function startGame(game) {
    await supabase.from('group_games').update({ status: 'started' }).eq('id', game.id)
    showToast('success', 'Game started! Play in person, then pick winner.')
  }

  async function selectWinner(game, winnerId) {
    // Update game status and winner
    await supabase
      .from('group_games')
      .update({ status: 'finished', winner_id: winnerId })
      .eq('id', game.id)

    // Award pot to winner
    const { data: winner } = await supabase
      .from('users')
      .select('balance')
      .eq('id', winnerId)
      .single()

    const newWinnerBalance = (winner?.balance || 0) + game.pot
    await supabase.from('users').update({ balance: newWinnerBalance }).eq('id', winnerId)

    // Create transaction
    await supabase.from('transactions').insert({
      to_user_id: winnerId,
      amount: game.pot,
      type: 'game_win',
      description: `Won ${game.name} game!`
    })

    // Notify winner
    await supabase.from('notifications').insert({
      user_id: winnerId,
      type: 'game_win',
      title: '🎮 You Won!',
      message: `You won ${game.pot} coins in ${game.name}!`,
      data: { game_id: game.id, amount: game.pot }
    })

    showToast('success', 'Winner selected! Pot distributed!')
  }

  const isCreator = (game) => game.creator_id === user?.id
  const hasJoined = (game) => game.players?.some(p => p.user_id === user?.id)
  const getPlayerStatus = (game) => game.players?.find(p => p.user_id === user?.id)

  return (
    <PageWrapper title="Group Games" withNav>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🎮</span> Group Games
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Create or join games with friends
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + Create Game
          </Button>
        </div>

        {/* Games List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading games...</div>
        ) : games.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-4xl mb-4">🎮</div>
            <p className="text-slate-400">No active games</p>
            <p className="text-slate-500 text-sm mt-2">Create one to get started!</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {games.map((game) => (
              <Card key={game.id} className="p-4">
                {/* Game Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white text-lg">{game.name}</h3>
                    <p className="text-slate-400 text-sm">
                      by {game.creator?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-coin-gold">{game.pot}🪙</div>
                    <div className="text-xs text-slate-400">pot</div>
                  </div>
                </div>

                {/* Game Info */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="bg-slate-800 px-3 py-1 rounded-lg">
                    <span className="text-slate-400">Buy-in:</span>{' '}
                    <span className="text-white font-semibold">{game.buy_in}🪙</span>
                  </div>
                  <div className="bg-slate-800 px-3 py-1 rounded-lg">
                    <span className="text-slate-400">Players:</span>{' '}
                    <span className="text-white font-semibold">{game.players?.length || 0}</span>
                  </div>
                  <div
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-semibold',
                      game.status === 'open' && 'bg-green-500/20 text-green-400',
                      game.status === 'started' && 'bg-yellow-500/20 text-yellow-400'
                    )}
                  >
                    {game.status === 'open' ? 'Open' : 'In Progress'}
                  </div>
                </div>

                {/* Players */}
                <div className="mb-4">
                  <p className="text-slate-400 text-xs mb-2">Players:</p>
                  <div className="flex flex-wrap gap-2">
                    {game.players?.map((player) => (
                      <div
                        key={player.id}
                        className={cn(
                          'px-3 py-1 rounded-full text-sm',
                          player.ready
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-700 text-slate-300'
                        )}
                      >
                        {player.user?.name || 'Unknown'}
                        {player.ready && ' ✓'}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {game.status === 'open' && (
                    <>
                      {!hasJoined(game) ? (
                        <Button onClick={() => joinGame(game)} className="flex-1">
                          Join ({game.buy_in}🪙)
                        </Button>
                      ) : (
                        <Button
                          onClick={() => markReady(game)}
                          variant={getPlayerStatus(game)?.ready ? 'secondary' : 'primary'}
                          className="flex-1"
                        >
                          {getPlayerStatus(game)?.ready ? 'Not Ready' : 'Ready ✓'}
                        </Button>
                      )}

                      {isCreator(game) && game.players?.length >= 2 && (
                        <Button onClick={() => startGame(game)} variant="success" className="flex-1">
                          Start Game
                        </Button>
                      )}
                    </>
                  )}

                  {game.status === 'started' && isCreator(game) && (
                    <div className="w-full">
                      <p className="text-slate-400 text-sm mb-2">Select winner:</p>
                      <div className="flex flex-wrap gap-2">
                        {game.players?.map((player) => (
                          <Button
                            key={player.id}
                            onClick={() => selectWinner(game, player.user_id)}
                            variant="success"
                            size="sm"
                          >
                            {player.user?.name || 'Unknown'} Wins
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {game.status === 'started' && !isCreator(game) && (
                    <p className="text-yellow-400 text-sm italic">
                      Game in progress... waiting for winner selection
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Game Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create New Game</h2>

            {/* Game Name */}
            <div className="mb-4">
              <label className="text-slate-400 text-sm mb-1 block">Game Name</label>
              <input
                type="text"
                value={newGame.name}
                onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                placeholder="e.g., Poker Round 1"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Buy-in */}
            <div className="mb-6">
              <label className="text-slate-400 text-sm mb-2 block">Buy-in Amount</label>
              <div className="flex gap-2">
                {BUY_IN_OPTIONS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setNewGame({ ...newGame, buy_in: amount })}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-semibold transition-all',
                      newGame.buy_in === amount
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    )}
                  >
                    {amount}🪙
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={createGame} disabled={creating} className="flex-1">
                {creating ? 'Creating...' : `Create (${newGame.buy_in}🪙)`}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageWrapper>
  )
}
