import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { cn } from '../lib/utils'
import { getRandomSimpleMissions } from '../data/guestTraits'

const tabs = [
  { id: 'main', label: 'Main', icon: '🎯' },
  { id: 'games', label: 'Games', icon: '🎮' },
  { id: 'punishments', label: 'Punishments', icon: '😈' },
]

export function Missions() {
  const [activeTab, setActiveTab] = useState('main')
  const [missions, setMissions] = useState([])
  const [punishments, setPunishments] = useState([])
  const [photoChallenges, setPhotoChallenges] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMission, setSelectedMission] = useState(null)
  const [isGettingMore, setIsGettingMore] = useState(false)
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    if (!user?.id) return
    fetchData()
  }, [user?.id])

  const fetchData = async () => {
    try {
      // Fetch missions
      const { data: missionsData, error: missionsError } = await supabase
        .from('user_missions')
        .select(`
          *,
          target_user:users!user_missions_target_user_id_fkey(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (missionsError) throw missionsError
      setMissions(missionsData || [])

      // Fetch assigned punishments
      const { data: punishmentsData, error: punishmentsError } = await supabase
        .from('assigned_punishments')
        .select(`
          *,
          from_user:users!assigned_punishments_from_user_id_fkey(name)
        `)
        .eq('to_user_id', user.id)
        .in('status', ['pending', 'later'])
        .order('created_at', { ascending: false })

      if (punishmentsError) throw punishmentsError
      setPunishments(punishmentsData || [])

      // Fetch photo challenges (unread photo_prompt notifications)
      const { data: photoData, error: photoError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('data->>notification_type', 'photo_prompt')
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      if (photoError) throw photoError
      setPhotoChallenges(photoData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async (mission) => {
    if (mission.verification === 'honor') {
      // Self-report missions
      try {
        await supabase
          .from('user_missions')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', mission.id)

        // Award coins
        const newBalance = user.balance + mission.reward
        await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', user.id)

        await supabase.from('transactions').insert({
          to_user_id: user.id,
          amount: mission.reward,
          type: 'mission_complete',
          description: `Mission: ${mission.generated_text.substring(0, 30)}...`,
        })

        showToast('success', `+${mission.reward} coins! Mission complete!`)
        fetchData()
      } catch (error) {
        console.error('Error completing mission:', error)
        showToast('error', 'Failed to complete mission')
      }
    } else {
      // Show QR for verification
      setSelectedMission(mission)
    }
  }

  const mainMissions = missions.filter(m => m.status === 'assigned' && (!m.category || m.category === 'main'))
  const gameMissions = missions.filter(m => m.status === 'assigned' && m.category === 'game')
  const completedMissions = missions.filter(m => m.status === 'completed')
  const pendingPunishments = punishments.filter(p => p.status === 'pending')
  const laterPunishments = punishments.filter(p => p.status === 'later')

  // V3.0 - Get More Missions function
  const handleGetMoreMissions = async () => {
    if (isGettingMore) return

    // Check if user already has too many active missions
    if (mainMissions.length >= 5) {
      showToast('info', 'Complete some missions first! Max 5 active.')
      return
    }

    setIsGettingMore(true)

    try {
      // Get existing mission targets to avoid duplicates
      const existingTargets = missions
        .filter(m => m.target_user?.name)
        .map(m => m.target_user.name)

      // Generate 2 new simple missions
      const newMissions = getRandomSimpleMissions(2, existingTargets)

      if (newMissions.length === 0) {
        showToast('info', 'No more unique missions available!')
        setIsGettingMore(false)
        return
      }

      // Insert new missions
      const missionsToInsert = newMissions.map(m => ({
        user_id: user.id,
        generated_text: m.text,
        reward: m.reward,
        status: 'assigned',
        verification: 'honor',
        category: 'main'
      }))

      const { error } = await supabase
        .from('user_missions')
        .insert(missionsToInsert)

      if (error) throw error

      showToast('success', `🎯 Got ${newMissions.length} new missions!`)
      fetchData()
    } catch (error) {
      console.error('Error getting more missions:', error)
      showToast('error', 'Failed to get new missions')
    } finally {
      setIsGettingMore(false)
    }
  }

  return (
    <>
      <Header title="My Missions" showBack showBalance />

      <PageWrapper className="pt-0">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {tab.icon} {tab.label}
                  {tab.id === 'punishments' && pendingPunishments.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {pendingPunishments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Main Missions Tab */}
            {activeTab === 'main' && (
              <>
                {/* Photo Challenges Section */}
                {photoChallenges.length > 0 && (
                  <div className="mb-6">
                    <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/40">
                      <h3 className="text-purple-300 font-semibold mb-3 flex items-center gap-2">
                        <span className="text-xl">📸</span> PHOTO CHALLENGE
                      </h3>
                      <div className="space-y-3">
                        {photoChallenges.map((challenge) => (
                          <div
                            key={challenge.id}
                            className="flex items-center justify-between gap-3 bg-purple-500/10 rounded-xl p-3"
                          >
                            <div className="flex-1">
                              <p className="text-white">
                                {challenge.data?.prompt_emoji || '📸'} {challenge.data?.prompt_text || 'Take a photo!'}
                              </p>
                              <Badge variant="coin" size="sm" className="mt-1">+5🪙</Badge>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                const params = new URLSearchParams({
                                  promptId: challenge.data?.prompt_id || challenge.id,
                                  promptText: challenge.data?.prompt_text || 'Take a photo!',
                                  promptEmoji: challenge.data?.prompt_emoji || '📸'
                                })
                                navigate(`/photos?${params.toString()}`)
                              }}
                              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 whitespace-nowrap"
                            >
                              📷 Take Photo
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {mainMissions.length > 0 ? (
                  <div className="space-y-3 mb-8">
                    {mainMissions.map((mission) => (
                      <MissionCard
                        key={mission.id}
                        mission={mission}
                        onComplete={() => handleComplete(mission)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <span className="text-5xl block mb-4">🎯</span>
                    <p className="text-slate-400">No main missions yet!</p>
                  </div>
                )}

                {/* V3.0 - Get More Missions Button */}
                {mainMissions.length < 5 && (
                  <div className="mb-6">
                    <Button
                      variant="gold"
                      fullWidth
                      onClick={handleGetMoreMissions}
                      loading={isGettingMore}
                    >
                      🎲 Get More Missions
                    </Button>
                    <p className="text-slate-500 text-xs text-center mt-2">
                      {mainMissions.length}/5 active missions
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Game Missions Tab */}
            {activeTab === 'games' && (
              <>
                {gameMissions.length > 0 ? (
                  <div className="space-y-3 mb-8">
                    {gameMissions.map((mission) => (
                      <MissionCard
                        key={mission.id}
                        mission={mission}
                        onComplete={() => handleComplete(mission)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <span className="text-5xl block mb-4">🎮</span>
                    <p className="text-slate-400">No game missions yet!</p>
                  </div>
                )}
              </>
            )}

            {/* Punishments Tab */}
            {activeTab === 'punishments' && (
              <>
                {pendingPunishments.length > 0 || laterPunishments.length > 0 ? (
                  <>
                    {/* Pending Punishments */}
                    {pendingPunishments.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-3">
                          ⏰ Active
                        </h3>
                        <div className="space-y-3">
                          {pendingPunishments.map((punishment) => (
                            <PunishmentCard
                              key={punishment.id}
                              punishment={punishment}
                              onRefresh={fetchData}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Later Punishments */}
                    {laterPunishments.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                          📅 Saved for Later
                        </h3>
                        <div className="space-y-3">
                          {laterPunishments.map((punishment) => (
                            <PunishmentCard
                              key={punishment.id}
                              punishment={punishment}
                              onRefresh={fetchData}
                              isLater
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <span className="text-5xl block mb-4">😈</span>
                    <p className="text-slate-400">No punishments!</p>
                    <p className="text-slate-500 text-sm mt-2">You're doing great!</p>
                  </div>
                )}
              </>
            )}

            {/* Completed Section (all tabs) */}
            {completedMissions.length > 0 && activeTab !== 'punishments' && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  ✅ Completed
                  <Badge variant="success" size="sm">{completedMissions.length}</Badge>
                </h3>
                <div className="space-y-3">
                  {completedMissions.map((mission) => (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      completed
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Warning */}
            {activeTab !== 'punishments' && (
              <div className="mt-8 bg-status-warning/10 rounded-xl p-4">
                <p className="text-status-warning text-sm">
                  ⚠️ Missions are SECRET! Don't reveal yours to others.
                </p>
              </div>
            )}
          </>
        )}
      </PageWrapper>

      {/* QR Modal for verification */}
      <Modal
        isOpen={!!selectedMission}
        onClose={() => setSelectedMission(null)}
        title="Get Confirmation"
      >
        {selectedMission && (
          <div className="text-center">
            <p className="text-slate-400 mb-4">
              Ask {selectedMission.target_user?.name || 'the person'} to scan this code:
            </p>

            <div className="bg-white p-4 rounded-xl inline-block">
              <QRCodeSVG
                value={`mission:${selectedMission.id}:${user.id}`}
                size={200}
                level="M"
              />
            </div>

            <p className="text-slate-500 text-sm mt-4">
              They will confirm your mission without seeing what it was!
            </p>

            <Button
              variant="ghost"
              fullWidth
              className="mt-6"
              onClick={() => setSelectedMission(null)}
            >
              Close
            </Button>
          </div>
        )}
      </Modal>
    </>
  )
}

function MissionCard({ mission, completed, onComplete }) {
  const difficultyColors = {
    easy: 'text-status-success',
    fun: 'text-pastel-blue',
    bold: 'text-status-warning',
  }

  return (
    <Card className={cn(completed && 'opacity-60')}>
      <div className="flex items-start gap-3">
        {completed ? (
          <span className="text-status-success text-xl">✓</span>
        ) : (
          <span className="text-xl">🎯</span>
        )}

        <div className="flex-1">
          <p className="text-white">{mission.generated_text}</p>

          {mission.target_user?.name && (
            <p className="text-pastel-purple text-sm mt-1">
              👤 Target: {mission.target_user.name}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <Badge variant="coin" size="sm">+{mission.reward}🪙</Badge>
            {mission.difficulty && (
              <span className={cn('text-xs', difficultyColors[mission.difficulty])}>
                {mission.difficulty}
              </span>
            )}
          </div>
        </div>
      </div>

      {!completed && onComplete && (
        <div className="mt-3">
          <Button variant="success" size="sm" fullWidth onClick={onComplete}>
            ✓ COMPLETE
          </Button>
        </div>
      )}
    </Card>
  )
}

function PunishmentCard({ punishment, onRefresh, isLater }) {
  const [timeLeft, setTimeLeft] = useState(null)
  const [isSkipping, setIsSkipping] = useState(false)
  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    if (!punishment.deadline || isLater) return

    const updateTimer = () => {
      const deadline = new Date(punishment.deadline)
      const now = new Date()
      const diff = deadline - now

      if (diff <= 0) {
        setTimeLeft('EXPIRED')
      } else {
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [punishment.deadline, isLater])

  const handleDone = async () => {
    try {
      await supabase
        .from('assigned_punishments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', punishment.id)

      showToast('success', 'Punishment completed!')
      onRefresh()
    } catch (error) {
      console.error('Error completing punishment:', error)
      showToast('error', 'Failed to complete')
    }
  }

  const handleLater = async () => {
    try {
      await supabase
        .from('assigned_punishments')
        .update({ status: 'later' })
        .eq('id', punishment.id)

      showToast('info', 'Saved for later')
      onRefresh()
    } catch (error) {
      console.error('Error saving punishment:', error)
      showToast('error', 'Failed to save')
    }
  }

  const handleSkipWithCoins = async () => {
    if (user.balance < 1) {
      showToast('error', 'Not enough coins!')
      return
    }

    setIsSkipping(true)
    try {
      // Deduct 1 coin
      const newBalance = user.balance - 1
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: 1,
        type: 'punishment_skip',
        description: `Skipped: ${punishment.punishment_text.substring(0, 30)}`,
      })

      updateBalance(newBalance)

      // Mark punishment as declined
      await supabase
        .from('assigned_punishments')
        .update({
          status: 'declined',
          completed_at: new Date().toISOString(),
        })
        .eq('id', punishment.id)

      showToast('success', 'Punishment skipped for 1 coin')
      onRefresh()
    } catch (error) {
      console.error('Error skipping punishment:', error)
      showToast('error', 'Failed to skip')
    } finally {
      setIsSkipping(false)
    }
  }

  const handleSkipWithDrink = async () => {
    setIsSkipping(true)
    try {
      // Mark current punishment as declined
      await supabase
        .from('assigned_punishments')
        .update({
          status: 'declined',
          completed_at: new Date().toISOString(),
        })
        .eq('id', punishment.id)

      // Create new drink punishment
      await supabase.from('assigned_punishments').insert({
        to_user_id: user.id,
        punishment_text: `Take a drink (skipped: ${punishment.punishment_text})`,
        source: 'punishment_decline',
        status: 'pending',
        deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })

      showToast('info', 'Punishment swapped for a drink')
      onRefresh()
    } catch (error) {
      console.error('Error swapping punishment:', error)
      showToast('error', 'Failed to swap')
    } finally {
      setIsSkipping(false)
    }
  }

  const isExpired = timeLeft === 'EXPIRED'

  return (
    <Card className={cn(isExpired && 'border-red-500/50 bg-red-500/5')}>
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">😈</span>
        <div className="flex-1">
          <p className="text-white">{punishment.punishment_text}</p>
          {punishment.from_user?.name && (
            <p className="text-slate-400 text-sm mt-1">
              From: {punishment.from_user.name}
            </p>
          )}

          {!isLater && timeLeft && (
            <div className="mt-2">
              <Badge
                variant={isExpired ? 'danger' : 'warning'}
                size="sm"
              >
                {isExpired ? '⏰ EXPIRED' : `⏰ ${timeLeft}`}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {isLater ? (
        <Button
          variant="primary"
          size="sm"
          fullWidth
          onClick={async () => {
            await supabase
              .from('assigned_punishments')
              .update({
                status: 'pending',
                deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              })
              .eq('id', punishment.id)
            showToast('info', 'Punishment activated!')
            onRefresh()
          }}
        >
          ▶️ Do Now
        </Button>
      ) : (
        <div className="space-y-2">
          <Button
            variant="success"
            size="sm"
            fullWidth
            onClick={handleDone}
          >
            ✓ Done
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLater}
            >
              ⏰ Later
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipWithDrink}
              loading={isSkipping}
            >
              🍺 Drink
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleSkipWithCoins}
              loading={isSkipping}
            >
              💰 1🪙
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
