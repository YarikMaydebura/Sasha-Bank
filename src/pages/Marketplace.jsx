import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'

const MIN_DESCRIPTION_LENGTH = 10
const MAX_REWARD = 10
const MIN_REWARD = 1
const COOLDOWN_MINUTES = 10

export default function Marketplace() {
  const { user, updateBalance } = useUserStore()
  const { showToast } = useUIStore()
  const [missions, setMissions] = useState([])
  const [myMissions, setMyMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('browse') // browse | create | my
  const [newMission, setNewMission] = useState({ description: '', reward: 3 })
  const [creating, setCreating] = useState(false)

  // Load missions
  useEffect(() => {
    loadMissions()

    // Subscribe to changes
    const channel = supabase
      .channel('marketplace')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_missions' }, loadMissions)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadMissions() {
    // Load available missions
    const { data: available } = await supabase
      .from('market_missions')
      .select(`
        *,
        creator:creator_id(id, name),
        accepter:accepter_id(id, name)
      `)
      .eq('status', 'available')
      .order('created_at', { ascending: false })

    // Load my created missions
    const { data: mine } = await supabase
      .from('market_missions')
      .select(`
        *,
        creator:creator_id(id, name),
        accepter:accepter_id(id, name)
      `)
      .eq('creator_id', user?.id)
      .order('created_at', { ascending: false })

    setMissions(available || [])
    setMyMissions(mine || [])
    setLoading(false)
  }

  async function createMission() {
    if (newMission.description.trim().length < MIN_DESCRIPTION_LENGTH) {
      showToast('error', `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`)
      return
    }

    if (newMission.reward < MIN_REWARD || newMission.reward > MAX_REWARD) {
      showToast('error', `Reward must be between ${MIN_REWARD} and ${MAX_REWARD} coins`)
      return
    }

    if (user.balance < newMission.reward) {
      showToast('error', 'Not enough coins!')
      return
    }

    setCreating(true)

    // Create mission
    const { error } = await supabase.from('market_missions').insert({
      creator_id: user.id,
      description: newMission.description.trim(),
      reward: newMission.reward,
      status: 'available'
    })

    if (error) {
      showToast('error', 'Failed to create mission')
      setCreating(false)
      return
    }

    // Reserve coins (deduct from creator)
    const newBalance = user.balance - newMission.reward
    await supabase.from('users').update({ balance: newBalance }).eq('id', user.id)
    updateBalance(newBalance)

    // Create transaction
    await supabase.from('transactions').insert({
      from_user_id: user.id,
      amount: newMission.reward,
      type: 'mission_create',
      description: `Created marketplace mission: ${newMission.description.slice(0, 30)}...`
    })

    showToast('success', 'Mission created!')
    setNewMission({ description: '', reward: 3 })
    setActiveTab('my')
    setCreating(false)

    // V3.0: Force refresh to show mission immediately
    await loadMissions()
  }

  async function acceptMission(mission) {
    // Check cooldown (same creator-accepter pair)
    const { data: recentCompletions } = await supabase
      .from('market_missions')
      .select('completed_at')
      .eq('creator_id', mission.creator_id)
      .eq('accepter_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)

    if (recentCompletions?.length > 0) {
      const lastCompletion = new Date(recentCompletions[0].completed_at)
      const cooldownEnd = new Date(lastCompletion.getTime() + COOLDOWN_MINUTES * 60 * 1000)
      if (new Date() < cooldownEnd) {
        const minutesLeft = Math.ceil((cooldownEnd - new Date()) / 60000)
        showToast('error', `Wait ${minutesLeft} more minutes before accepting from this creator`)
        return
      }
    }

    // Accept mission
    const { error } = await supabase
      .from('market_missions')
      .update({ status: 'accepted', accepter_id: user.id })
      .eq('id', mission.id)
      .eq('status', 'available') // Only if still available

    if (error) {
      showToast('error', 'Failed to accept mission')
      return
    }

    // Notify creator
    await supabase.from('notifications').insert({
      user_id: mission.creator_id,
      type: 'mission_accepted',
      title: '🎯 Mission Accepted!',
      message: `${user.name} accepted your mission: "${mission.description.slice(0, 30)}..."`,
      data: { mission_id: mission.id }
    })

    showToast('success', 'Mission accepted! Complete it and tell the creator.')

    // V3.0: Force refresh to update lists immediately
    await loadMissions()
  }

  async function completeMission(mission) {
    // Only creator can mark as complete
    if (mission.creator_id !== user.id) {
      showToast('error', 'Only the creator can confirm completion')
      return
    }

    // Mark as completed
    const { error } = await supabase
      .from('market_missions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', mission.id)

    if (error) {
      showToast('error', 'Failed to complete mission')
      return
    }

    // Award coins to accepter
    const { data: accepter } = await supabase
      .from('users')
      .select('balance')
      .eq('id', mission.accepter_id)
      .single()

    const newAccepterBalance = (accepter?.balance || 0) + mission.reward
    await supabase.from('users').update({ balance: newAccepterBalance }).eq('id', mission.accepter_id)

    // Create transaction
    await supabase.from('transactions').insert({
      from_user_id: user.id,
      to_user_id: mission.accepter_id,
      amount: mission.reward,
      type: 'mission_complete',
      description: `Completed marketplace mission: ${mission.description.slice(0, 30)}...`
    })

    // Notify accepter
    await supabase.from('notifications').insert({
      user_id: mission.accepter_id,
      type: 'mission_completed',
      title: '✅ Mission Complete!',
      message: `You earned ${mission.reward} coins for completing: "${mission.description.slice(0, 30)}..."`,
      data: { mission_id: mission.id, reward: mission.reward }
    })

    showToast('success', `Mission completed! ${mission.reward} coins sent to ${mission.accepter?.name || 'player'}`)
  }

  async function cancelMission(mission) {
    // Only creator can cancel available missions
    if (mission.creator_id !== user.id || mission.status !== 'available') {
      showToast('error', 'Cannot cancel this mission')
      return
    }

    // Cancel mission
    const { error } = await supabase
      .from('market_missions')
      .update({ status: 'cancelled' })
      .eq('id', mission.id)

    if (error) {
      showToast('error', 'Failed to cancel mission')
      return
    }

    // Refund coins
    const newBalance = user.balance + mission.reward
    await supabase.from('users').update({ balance: newBalance }).eq('id', user.id)
    updateBalance(newBalance)

    showToast('success', 'Mission cancelled. Coins refunded!')
  }

  return (
    <PageWrapper title="Marketplace" withNav>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🏪</span> Mission Marketplace
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Create missions for others or complete missions for coins
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {['browse', 'create', 'my'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-2 rounded-lg font-medium transition-all',
                activeTab === tab
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              )}
            >
              {tab === 'browse' && '🔍 Browse'}
              {tab === 'create' && '➕ Create'}
              {tab === 'my' && '📋 My Missions'}
            </button>
          ))}
        </div>

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading missions...</div>
            ) : missions.filter(m => m.creator_id !== user?.id).length === 0 ? (
              <Card className="text-center py-12">
                <div className="text-4xl mb-4">🏪</div>
                <p className="text-slate-400">No missions available</p>
                <p className="text-slate-500 text-sm mt-2">Check back later or create your own!</p>
              </Card>
            ) : (
              missions
                .filter(m => m.creator_id !== user?.id)
                .map((mission) => (
                  <Card key={mission.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-white font-medium">{mission.description}</p>
                        <p className="text-slate-400 text-sm mt-1">
                          by {mission.creator?.name || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-coin-gold">{mission.reward}🪙</div>
                        <Button onClick={() => acceptMission(mission)} size="sm" className="mt-2">
                          Accept
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
            )}
          </div>
        )}

        {/* Create Tab */}
        {activeTab === 'create' && (
          <Card className="p-6">
            <h2 className="text-lg font-bold text-white mb-4">Create New Mission</h2>

            {/* Description */}
            <div className="mb-4">
              <label className="text-slate-400 text-sm mb-1 block">
                Mission Description ({newMission.description.length}/{MIN_DESCRIPTION_LENGTH}+ chars)
              </label>
              <textarea
                value={newMission.description}
                onChange={(e) => setNewMission({ ...newMission, description: e.target.value })}
                placeholder="e.g., Dance with someone for 30 seconds"
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* Reward */}
            <div className="mb-6">
              <label className="text-slate-400 text-sm mb-2 block">
                Reward Amount (from your balance)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 5, 7, 10].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setNewMission({ ...newMission, reward: amount })}
                    disabled={user?.balance < amount}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-semibold transition-all',
                      newMission.reward === amount
                        ? 'bg-purple-500 text-white'
                        : user?.balance >= amount
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    )}
                  >
                    {amount}🪙
                  </button>
                ))}
              </div>
              <p className="text-slate-500 text-xs mt-2">
                Your balance: {user?.balance || 0}🪙
              </p>
            </div>

            {/* Create Button */}
            <Button
              onClick={createMission}
              disabled={creating || newMission.description.length < MIN_DESCRIPTION_LENGTH}
              className="w-full"
            >
              {creating ? 'Creating...' : `Create Mission (${newMission.reward}🪙)`}
            </Button>
          </Card>
        )}

        {/* My Missions Tab */}
        {activeTab === 'my' && (
          <div className="space-y-4">
            {myMissions.length === 0 ? (
              <Card className="text-center py-12">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-slate-400">No missions created yet</p>
                <Button onClick={() => setActiveTab('create')} className="mt-4">
                  Create Your First Mission
                </Button>
              </Card>
            ) : (
              myMissions.map((mission) => (
                <Card key={mission.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-white font-medium">{mission.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            mission.status === 'available' && 'bg-green-500/20 text-green-400',
                            mission.status === 'accepted' && 'bg-yellow-500/20 text-yellow-400',
                            mission.status === 'completed' && 'bg-blue-500/20 text-blue-400',
                            mission.status === 'cancelled' && 'bg-slate-500/20 text-slate-400'
                          )}
                        >
                          {mission.status}
                        </span>
                        {mission.accepter && (
                          <span className="text-slate-400 text-sm">
                            by {mission.accepter.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-coin-gold">{mission.reward}🪙</div>
                      {mission.status === 'available' && (
                        <Button onClick={() => cancelMission(mission)} variant="danger" size="sm" className="mt-2">
                          Cancel
                        </Button>
                      )}
                      {mission.status === 'accepted' && (
                        <Button onClick={() => completeMission(mission)} variant="success" size="sm" className="mt-2">
                          Confirm Done
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
