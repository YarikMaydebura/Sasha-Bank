import { useState, useEffect } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'
import { timeAgo, cn } from '../lib/utils'

const typeIcons = {
  registration: '🎉',
  bar_order: '🍸',
  trivia_entry: '🧠',
  trivia_win: '🏆',
  risk_draw: '🎲',
  risk_effect: '🎴',
  mission_complete: '🎯',
  trade_sent: '💸',
  trade_received: '💰',
  lottery_ticket: '🎟️',
  lottery_win: '🎰',
  admin_award: '👑',
  admin_deduct: '⚠️',
  box_bid: '📦',
  box_win: '🏆',
}

export function History() {
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const user = useUserStore((state) => state.user)

  useEffect(() => {
    if (!user?.id) return
    fetchTransactions()
  }, [user?.id])

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header title="History" showBack showBalance />

      <PageWrapper className="pt-0">
        <p className="text-slate-400 text-sm mb-4">
          📜 Your transactions
        </p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const isIncoming = tx.to_user_id === user.id
              const icon = typeIcons[tx.type] || '💫'

              return (
                <Card key={tx.id} className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">
                      {tx.description}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {timeAgo(tx.created_at)}
                    </p>
                  </div>
                  <span className={cn(
                    'font-bold',
                    isIncoming ? 'text-status-success' : 'text-status-error'
                  )}>
                    {isIncoming ? '+' : '-'}{tx.amount}🪙
                  </span>
                </Card>
              )
            })}

            {transactions.length === 0 && (
              <p className="text-center text-slate-400 py-8">
                No transactions yet!
              </p>
            )}
          </div>
        )}
      </PageWrapper>
    </>
  )
}
