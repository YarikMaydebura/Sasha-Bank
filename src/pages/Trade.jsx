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
import { Minus, Plus } from 'lucide-react'

export function Trade() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [amount, setAmount] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [pendingTrades, setPendingTrades] = useState([])

  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    fetchUsers()
    fetchPendingTrades()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .neq('id', user?.id)
        .eq('is_admin', false)
        .order('name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPendingTrades = async () => {
    // In a real app, you'd have a trades table with pending status
    // For now, this is a placeholder
    setPendingTrades([])
  }

  const handleSend = async () => {
    if (!selectedUser || !user) return

    if (user.balance < amount) {
      showToast('error', "Not enough coins!")
      return
    }

    setIsSending(true)

    try {
      // Deduct from sender
      const senderNewBalance = user.balance - amount
      await supabase
        .from('users')
        .update({ balance: senderNewBalance })
        .eq('id', user.id)

      // Add to recipient
      const { data: recipient } = await supabase
        .from('users')
        .select('balance')
        .eq('id', selectedUser.id)
        .single()

      await supabase
        .from('users')
        .update({ balance: recipient.balance + amount })
        .eq('id', selectedUser.id)

      // Log transactions
      await supabase.from('transactions').insert([
        {
          from_user_id: user.id,
          to_user_id: selectedUser.id,
          amount: amount,
          type: 'trade_sent',
          description: `Sent to ${selectedUser.name}`,
        },
        {
          from_user_id: user.id,
          to_user_id: selectedUser.id,
          amount: amount,
          type: 'trade_received',
          description: `Received from ${user.name}`,
        },
      ])

      updateBalance(senderNewBalance)
      showToast('success', `Sent ${amount}🪙 to ${selectedUser.name}!`)

      // Reset form
      setSelectedUser(null)
      setAmount(1)
    } catch (error) {
      console.error('Error sending trade:', error)
      showToast('error', 'Failed to send coins')
    } finally {
      setIsSending(false)
    }
  }

  const maxAmount = Math.min(CONSTANTS.TRADE_MAX, user?.balance || 0)

  return (
    <>
      <Header title="Trade" showBack showBalance />

      <PageWrapper className="pt-0">
        {/* Send coins section */}
        <Card>
          <h3 className="text-white font-semibold mb-4">SEND COINS</h3>

          {/* User select */}
          <div className="mb-4">
            <label className="text-sm text-pastel-purple-light block mb-2">
              To:
            </label>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : (
              <select
                value={selectedUser?.id || ''}
                onChange={(e) => {
                  const u = users.find((u) => u.id === e.target.value)
                  setSelectedUser(u || null)
                }}
                className="w-full bg-bg-input border border-pastel-purple/30 rounded-xl px-4 py-3 text-white"
              >
                <option value="">Select guest...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Amount selector */}
          <div className="mb-4">
            <label className="text-sm text-pastel-purple-light block mb-2">
              Amount:
            </label>
            <div className="flex items-center justify-center gap-4 bg-bg-input rounded-xl p-3">
              <button
                onClick={() => setAmount(Math.max(CONSTANTS.TRADE_MIN, amount - 1))}
                disabled={amount <= CONSTANTS.TRADE_MIN}
                className="p-2 rounded-lg bg-bg-card hover:bg-bg-card-hover disabled:opacity-50"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-coin-gold text-3xl font-bold w-16 text-center">
                {amount}🪙
              </span>
              <button
                onClick={() => setAmount(Math.min(maxAmount, amount + 1))}
                disabled={amount >= maxAmount}
                className="p-2 rounded-lg bg-bg-card hover:bg-bg-card-hover disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-500 text-xs text-center mt-2">
              Min: {CONSTANTS.TRADE_MIN} | Max: {CONSTANTS.TRADE_MAX}
            </p>
          </div>

          <Button
            variant="gold"
            fullWidth
            onClick={handleSend}
            loading={isSending}
            disabled={!selectedUser || amount > (user?.balance || 0)}
          >
            💸 SEND
          </Button>
        </Card>

        {/* Pending trades */}
        {pendingTrades.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              INCOMING REQUESTS
              <Badge variant="pink" size="sm">{pendingTrades.length}</Badge>
            </h3>

            <div className="space-y-2">
              {pendingTrades.map((trade) => (
                <Card key={trade.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-white">
                      {trade.from_user_name} wants to send you{' '}
                      <span className="text-coin-gold">{trade.amount}🪙</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="success" size="sm">Accept</Button>
                    <Button variant="ghost" size="sm">Decline</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </PageWrapper>
    </>
  )
}
