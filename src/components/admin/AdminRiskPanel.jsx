import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { supabase } from '../../lib/supabase'
import { physicalRiskCards, cardTypeColors } from '../../data/physicalRiskCards'

export function AdminRiskPanel() {
  const [waitingSessions, setWaitingSessions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedCard, setSelectedCard] = useState(null)

  // Fetch waiting sessions
  useEffect(() => {
    fetchWaitingSessions()

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
          fetchWaitingSessions()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchWaitingSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('risk_sessions')
        .select(`
          *,
          users!inner(id, name, balance)
        `)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })

      if (error) throw error

      setWaitingSessions(data || [])
    } catch (error) {
      console.error('Error fetching risk sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignCard = async () => {
    if (!selectedSession || !selectedCard) return

    try {
      // Update session with assigned card
      const { error } = await supabase
        .from('risk_sessions')
        .update({
          status: 'assigned',
          card_id: selectedCard.id,
          card_result: {
            id: selectedCard.id,
            name: selectedCard.name,
            type: selectedCard.type,
            description: selectedCard.description,
          },
        })
        .eq('id', selectedSession.id)

      if (error) throw error

      // Reset selection
      setSelectedSession(null)
      setSelectedCard(null)

      // Refresh list
      fetchWaitingSessions()
    } catch (error) {
      console.error('Error assigning card:', error)
      alert('Failed to assign card')
    }
  }

  const levelCards = selectedSession
    ? physicalRiskCards.filter(card => card.level === selectedSession.level)
    : []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Waiting Sessions */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">
          Waiting for Cards ({waitingSessions.length})
        </h3>

        {waitingSessions.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-white/60">No one is waiting for cards</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {waitingSessions.map((session) => (
              <Card
                key={session.id}
                hoverable
                onClick={() => setSelectedSession(session)}
                className={`p-4 cursor-pointer transition-all ${
                  selectedSession?.id === session.id
                    ? 'border-2 border-yellow-500 bg-yellow-500/10'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-lg">
                      {session.users.name}
                    </p>
                    <p className="text-white/60 text-sm">
                      Level {session.level} • {session.users.balance} coins
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-yellow-400 text-2xl">⏳</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Card Selection */}
      {selectedSession && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">
            Select Card for {selectedSession.users.name} (Level {selectedSession.level})
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            {levelCards.map((card) => {
              const colors = cardTypeColors[card.type] || cardTypeColors.reward

              return (
                <Card
                  key={card.id}
                  hoverable
                  onClick={() => setSelectedCard(card)}
                  className={`p-3 cursor-pointer transition-all ${
                    selectedCard?.id === card.id
                      ? `border-2 ${colors.border} ${colors.bg}`
                      : 'border-white/10'
                  }`}
                >
                  <div className="text-center">
                    <span className="text-4xl block mb-2">{card.emoji}</span>
                    <p className={`text-xs font-bold mb-1 ${colors.text}`}>
                      {card.id}
                    </p>
                    <p className="text-white font-medium text-sm mb-1">
                      {card.name}
                    </p>
                    <p className="text-white/60 text-xs line-clamp-2">
                      {card.description}
                    </p>
                    {card.coin_change !== undefined && card.coin_change !== 0 && (
                      <p className={`text-sm font-bold mt-1 ${colors.text}`}>
                        {card.coin_change > 0 ? '+' : ''}{card.coin_change}🪙
                      </p>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          {selectedCard && (
            <div className="flex gap-3">
              <Button
                variant="primary"
                fullWidth
                onClick={handleAssignCard}
                className="py-3"
              >
                Assign {selectedCard.name} to {selectedSession.users.name}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedSession(null)
                  setSelectedCard(null)
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
