import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { supabase } from '../../lib/supabase'

export function AdminRiskPanel() {
  const [recentSessions, setRecentSessions] = useState([])
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, cardsWon: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRiskData()

    // Subscribe to new sessions
    const channel = supabase
      .channel('risk_sessions_admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'risk_sessions',
        },
        () => {
          fetchRiskData()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchRiskData = async () => {
    try {
      // Get recent sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('risk_sessions')
        .select(`
          *,
          users!inner(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (sessionsError) throw sessionsError

      setRecentSessions(sessions || [])

      // Calculate stats
      const total = sessions?.length || 0
      const wins = sessions?.filter((s) => s.card_result?.won === true).length || 0
      const losses = total - wins
      const cardsWon = sessions?.filter((s) => s.card_reward_id).length || 0

      setStats({ total, wins, losses, cardsWon })
    } catch (error) {
      console.error('Error fetching risk data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🤖</span>
          <div>
            <h3 className="text-white font-semibold mb-1">100% Automated Risk Station</h3>
            <p className="text-slate-300 text-sm">
              Risk games are fully automated with instant digital card results. No admin intervention required!
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-3xl font-bold text-white">{stats.total}</div>
          <div className="text-slate-400 text-xs mt-1">Total Games</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-green-400">{stats.wins}</div>
          <div className="text-slate-400 text-xs mt-1">Wins</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-red-400">{stats.losses}</div>
          <div className="text-slate-400 text-xs mt-1">Losses</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-purple-400">{stats.cardsWon}</div>
          <div className="text-slate-400 text-xs mt-1">Cards Won</div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>

        {recentSessions.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-white/60">No Risk activity yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentSessions.slice(0, 10).map((session) => (
              <Card key={session.id} className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{session.users?.name}</p>
                  <p className="text-slate-400 text-sm">
                    Level {session.level} • {new Date(session.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {session.card_reward_id && (
                    <Badge variant="purple" size="sm">
                      🃏 Card Won
                    </Badge>
                  )}
                  <Badge
                    variant={session.card_result?.won ? 'success' : 'secondary'}
                    size="sm"
                  >
                    {session.card_result?.won ? '✅ Win' : '❌ Loss'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
