import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'

const MIN_BUY_IN_OPTIONS = [3, 5, 10, 20]

/**
 * Poker - V3.0
 * User-created poker tables (not admin-controlled)
 * Similar to GroupGames but for poker
 */
export function Poker() {
  const navigate = useNavigate()
  const { user, updateBalance } = useUserStore()
  const { showToast } = useUIStore()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTable, setNewTable] = useState({ name: '', min_buy_in: 5, my_buy_in: 5 })
  const [creating, setCreating] = useState(false)

  // Load tables
  useEffect(() => {
    loadTables()

    // Subscribe to changes
    const channel = supabase
      .channel('poker_tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_tables' }, loadTables)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_players' }, loadTables)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadTables() {
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
      .in('status', ['waiting', 'playing'])
      .order('created_at', { ascending: false })

    if (!error) {
      setTables(data || [])
    }
    setLoading(false)
  }

  async function createTable() {
    if (!newTable.name.trim()) {
      showToast('error', 'Please enter a table name')
      return
    }

    if (newTable.my_buy_in < newTable.min_buy_in) {
      showToast('error', `Your buy-in must be at least ${newTable.min_buy_in} coins`)
      return
    }

    if (user.balance < newTable.my_buy_in) {
      showToast('error', 'Not enough coins!')
      return
    }

    setCreating(true)

    // Create table
    const { data: table, error } = await supabase
      .from('poker_tables')
      .insert({
        name: newTable.name.trim(),
        min_buy_in: newTable.min_buy_in,
        creator_id: user.id,
        pot: newTable.my_buy_in,
        status: 'waiting'
      })
      .select()
      .single()

    if (error) {
      showToast('error', 'Failed to create table')
      setCreating(false)
      return
    }

    // Join as first player
    await supabase.from('poker_players').insert({
      table_id: table.id,
      user_id: user.id,
      buy_in: newTable.my_buy_in,
      stack: newTable.my_buy_in,
      ready: true
    })

    // Deduct buy-in
    const newBalance = user.balance - newTable.my_buy_in
    await supabase.from('users').update({ balance: newBalance }).eq('id', user.id)
    updateBalance(newBalance)

    // Create transaction
    await supabase.from('transactions').insert({
      from_user_id: user.id,
      amount: newTable.my_buy_in,
      type: 'poker_buy_in',
      description: `Poker buy-in for ${newTable.name}`
    })

    showToast('success', 'Table created!')
    setShowCreateModal(false)
    setNewTable({ name: '', min_buy_in: 5, my_buy_in: 5 })
    setCreating(false)

    // Navigate to table room
    navigate(`/poker/${table.id}`)
  }

  async function joinTable(table, buyInAmount) {
    if (buyInAmount < table.min_buy_in) {
      showToast('error', `Minimum buy-in is ${table.min_buy_in} coins`)
      return
    }

    if (user.balance < buyInAmount) {
      showToast('error', 'Not enough coins!')
      return
    }

    // Check if already joined
    const alreadyJoined = table.players?.some(p => p.user_id === user.id)
    if (alreadyJoined) {
      showToast('error', 'Already at this table!')
      return
    }

    // Join table
    await supabase.from('poker_players').insert({
      table_id: table.id,
      user_id: user.id,
      buy_in: buyInAmount,
      stack: buyInAmount,
      ready: false
    })

    // Update pot
    const newPot = table.pot + buyInAmount
    await supabase.from('poker_tables').update({ pot: newPot }).eq('id', table.id)

    // Deduct buy-in
    const newBalance = user.balance - buyInAmount
    await supabase.from('users').update({ balance: newBalance }).eq('id', user.id)
    updateBalance(newBalance)

    // Create transaction
    await supabase.from('transactions').insert({
      from_user_id: user.id,
      amount: buyInAmount,
      type: 'poker_buy_in',
      description: `Joined poker table: ${table.name}`
    })

    showToast('success', 'Joined table!')

    // Navigate to table room
    navigate(`/poker/${table.id}`)
  }

  const hasJoined = (table) => table.players?.some(p => p.user_id === user?.id)

  return (
    <PageWrapper title="Poker" withNav>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🃏</span> Poker
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Create or join poker tables
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + Create Table
          </Button>
        </div>

        {/* Tables List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading tables...</div>
        ) : tables.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-4xl mb-4">🃏</div>
            <p className="text-slate-400">No active tables</p>
            <p className="text-slate-500 text-sm mt-2">Create one to get started!</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {tables.map((table) => (
              <Card
                key={table.id}
                className={cn(
                  'p-4',
                  hasJoined(table) && 'cursor-pointer hover:border-purple-500/50 transition-colors'
                )}
                onClick={() => hasJoined(table) && navigate(`/poker/${table.id}`)}
              >
                {/* Table Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white text-lg">{table.name}</h3>
                    <p className="text-slate-400 text-sm">
                      by {table.creator?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-coin-gold">{table.pot}🪙</div>
                    <div className="text-xs text-slate-400">pot</div>
                  </div>
                </div>

                {/* Table Info */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="bg-slate-800 px-3 py-1 rounded-lg">
                    <span className="text-slate-400">Min:</span>{' '}
                    <span className="text-white font-semibold">{table.min_buy_in}🪙</span>
                  </div>
                  <div className="bg-slate-800 px-3 py-1 rounded-lg">
                    <span className="text-slate-400">Players:</span>{' '}
                    <span className="text-white font-semibold">{table.players?.length || 0}</span>
                  </div>
                  <div
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-semibold',
                      table.status === 'waiting' && 'bg-green-500/20 text-green-400',
                      table.status === 'playing' && 'bg-yellow-500/20 text-yellow-400'
                    )}
                  >
                    {table.status === 'waiting' ? 'Open' : 'In Progress'}
                  </div>
                </div>

                {/* Players */}
                <div className="mb-4">
                  <p className="text-slate-400 text-xs mb-2">Players:</p>
                  <div className="flex flex-wrap gap-2">
                    {table.players?.map((player) => (
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
                        <span className="text-coin-gold ml-1">({player.stack}🪙)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {table.status === 'waiting' && !hasJoined(table) && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        const buyIn = prompt(`Enter your buy-in (minimum ${table.min_buy_in}🪙):`, table.min_buy_in)
                        if (buyIn) {
                          joinTable(table, parseInt(buyIn))
                        }
                      }}
                      className="flex-1"
                    >
                      Join ({table.min_buy_in}🪙+)
                    </Button>
                  )}

                  {hasJoined(table) && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/poker/${table.id}`)
                      }}
                      variant="secondary"
                      className="flex-1"
                    >
                      Enter Table →
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Table Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create Poker Table</h2>

            {/* Table Name */}
            <div className="mb-4">
              <label className="text-slate-400 text-sm mb-1 block">Table Name</label>
              <input
                type="text"
                value={newTable.name}
                onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                placeholder={`${user?.name}'s Table`}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Minimum Buy-in */}
            <div className="mb-4">
              <label className="text-slate-400 text-sm mb-2 block">Minimum Buy-in</label>
              <div className="flex gap-2">
                {MIN_BUY_IN_OPTIONS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setNewTable({
                      ...newTable,
                      min_buy_in: amount,
                      my_buy_in: Math.max(newTable.my_buy_in, amount)
                    })}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-semibold transition-all',
                      newTable.min_buy_in === amount
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    )}
                  >
                    {amount}🪙
                  </button>
                ))}
              </div>
            </div>

            {/* Your Buy-in */}
            <div className="mb-6">
              <label className="text-slate-400 text-sm mb-2 block">Your Buy-in</label>
              <input
                type="number"
                value={newTable.my_buy_in}
                onChange={(e) => setNewTable({ ...newTable, my_buy_in: parseInt(e.target.value) || 0 })}
                min={newTable.min_buy_in}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-slate-500 text-xs mt-1">Your balance: {user?.balance}🪙</p>
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
              <Button
                onClick={createTable}
                disabled={creating || newTable.my_buy_in > user?.balance}
                className="flex-1"
              >
                {creating ? 'Creating...' : `Create (${newTable.my_buy_in}🪙)`}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageWrapper>
  )
}

export default Poker
