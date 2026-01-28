import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { supabase } from '../../lib/supabase'
import { useUIStore } from '../../stores/uiStore'
import { cards } from '../../data/cards'
import { cn } from '../../lib/utils'

export function GuestAskPanel() {
  const [cardUsages, setCardUsages] = useState([])
  const [songRequests, setSongRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    fetchGuestRequests()

    // Real-time subscription
    const channel = supabase
      .channel('guest-requests-admin')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'card_usage_logs',
        },
        () => {
          fetchGuestRequests()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'song_requests',
        },
        () => {
          fetchGuestRequests()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchGuestRequests = async () => {
    try {
      // Get card usages that require admin attention
      const { data: cardData, error: cardError } = await supabase
        .from('card_usage_logs')
        .select(`
          *,
          user:user_id (id, name),
          target:target_user_id (id, name)
        `)
        .eq('admin_notified', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (cardError) throw cardError

      // Filter for cards that require admin action
      const adminCards = cardData.filter((log) => {
        const card = cards.find((c) => c.id === log.card_id)
        return card?.requires_admin
      })

      setCardUsages(adminCards || [])

      // Get pending song requests
      const { data: songData, error: songError } = await supabase
        .from('song_requests')
        .select(`
          *,
          user:user_id (id, name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (songError) throw songError
      setSongRequests(songData || [])
    } catch (error) {
      console.error('Error fetching guest requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkSongDone = async (songRequest) => {
    try {
      await supabase
        .from('song_requests')
        .update({ status: 'played' })
        .eq('id', songRequest.id)

      // Notify user
      await supabase.from('notifications').insert({
        user_id: songRequest.user_id,
        type: 'song_played',
        title: '🎵 Song Request Played!',
        message: `Your request "${songRequest.song_title}" has been played!`,
        data: {
          song_title: songRequest.song_title,
        },
      })

      showToast('success', 'Song marked as played')
      fetchGuestRequests()
    } catch (error) {
      console.error('Error marking song:', error)
      showToast('error', 'Failed to mark song')
    }
  }

  const handleAcknowledgeCard = async (cardUsage) => {
    try {
      // Just mark as acknowledged - the card effect was already applied
      showToast('success', 'Card usage acknowledged')
      // Remove from list by refetching
      fetchGuestRequests()
    } catch (error) {
      console.error('Error acknowledging card:', error)
    }
  }

  const totalRequests = cardUsages.length + songRequests.length

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/40">
        <div className="text-center">
          <p className="text-slate-400 text-sm mb-1">Pending Requests</p>
          <p className="text-white text-4xl font-bold">{totalRequests}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-blue-400 text-2xl font-bold">{cardUsages.length}</p>
            <p className="text-slate-400 text-xs">Card Actions</p>
          </div>
          <div className="text-center">
            <p className="text-purple-400 text-2xl font-bold">{songRequests.length}</p>
            <p className="text-slate-400 text-xs">Song Requests</p>
          </div>
        </div>
      </Card>

      {totalRequests === 0 && (
        <Card className="text-center py-8">
          <span className="text-5xl block mb-4">✨</span>
          <p className="text-white/60">No pending requests</p>
          <p className="text-slate-500 text-sm mt-2">
            Card actions and song requests will appear here
          </p>
        </Card>
      )}

      {/* Card Usage Requests */}
      {cardUsages.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Card Actions ({cardUsages.length})
          </h3>

          <div className="space-y-2">
            {cardUsages.map((usage) => {
              const card = cards.find((c) => c.id === usage.card_id)
              return (
                <Card
                  key={usage.id}
                  className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{card?.emoji || '🃏'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-semibold">{card?.name || usage.card_id}</h4>
                        <Badge variant="purple" size="sm">
                          Admin Action
                        </Badge>
                      </div>
                      <p className="text-slate-300 text-sm mb-2">{usage.effect_description}</p>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>👤 {usage.user?.name}</span>
                        {usage.target && (
                          <>
                            <span>→</span>
                            <span>{usage.target?.name}</span>
                          </>
                        )}
                      </div>

                      <p className="text-slate-500 text-xs mt-1">
                        {new Date(usage.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Action specific instructions */}
                  {usage.card_id === 'dj_power' && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                      <p className="text-blue-300 text-sm">
                        🎧 Play the requested song for {usage.user?.name}
                      </p>
                    </div>
                  )}

                  {usage.card_id === 'prank' && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-3">
                      <p className="text-orange-300 text-sm">
                        😈 Execute a fun prank on {usage.target?.name}
                      </p>
                    </div>
                  )}

                  {usage.card_id === 'mystery_box' && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-3">
                      <p className="text-purple-300 text-sm">
                        🎁 Give {usage.user?.name} a surprise reward
                      </p>
                    </div>
                  )}

                  {usage.card_id === 'chaos' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                      <p className="text-red-300 text-sm">
                        💥 Create a fun chaotic moment at the party!
                      </p>
                    </div>
                  )}

                  <Button
                    variant="success"
                    size="sm"
                    fullWidth
                    onClick={() => handleAcknowledgeCard(usage)}
                  >
                    ✅ Done
                  </Button>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Song Requests */}
      {songRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Song Requests ({songRequests.length})
          </h3>

          <div className="space-y-2">
            {songRequests.map((request) => (
              <Card
                key={request.id}
                className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">🎵</span>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-1">{request.song_title}</h4>
                    <p className="text-slate-400 text-sm">Requested by {request.user?.name}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <Button
                  variant="success"
                  size="sm"
                  fullWidth
                  onClick={() => handleMarkSongDone(request)}
                >
                  ✅ Mark as Played
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
