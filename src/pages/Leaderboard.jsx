import { useState, useEffect } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { BottomNav } from '../components/layout/BottomNav'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'
import { cn } from '../lib/utils'

export function Leaderboard() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const currentUser = useUserStore((state) => state.user)

  useEffect(() => {
    fetchLeaderboard()

    // Subscribe to changes
    const channel = supabase
      .channel('leaderboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
        },
        () => fetchLeaderboard()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, balance')
        .eq('is_admin', false)
        .order('balance', { ascending: false })
        .limit(50)

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return `${index + 1}.`
    }
  }

  return (
    <>
      <Header title="Leaderboard" showBalance />

      <PageWrapper withNav className="pt-0">
        <div className="text-center py-6">
          <span className="text-5xl">🏆</span>
          <h2 className="text-xl font-bold text-white mt-2">TOP BANKERS</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user, index) => (
              <Card
                key={user.id}
                className={cn(
                  'flex items-center gap-3',
                  user.id === currentUser?.id && 'border-pastel-purple bg-pastel-purple/10'
                )}
              >
                <span className="text-xl w-10 text-center">
                  {getRankIcon(index)}
                </span>
                <span className={cn(
                  'flex-1 font-medium truncate',
                  user.id === currentUser?.id ? 'text-pastel-purple' : 'text-white'
                )}>
                  {user.name}
                  {user.id === currentUser?.id && ' (You)'}
                </span>
                <span className="text-coin-gold font-bold">
                  {user.balance}🪙
                </span>
              </Card>
            ))}

            {users.length === 0 && (
              <p className="text-center text-slate-400 py-8">
                No players yet!
              </p>
            )}
          </div>
        )}
      </PageWrapper>

      <BottomNav />
    </>
  )
}
