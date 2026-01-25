import { useState, useEffect } from 'react'
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

export function Missions() {
  const [missions, setMissions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMission, setSelectedMission] = useState(null)
  const user = useUserStore((state) => state.user)
  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    if (!user?.id) return
    fetchMissions()
  }, [user?.id])

  const fetchMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_missions')
        .select(`
          *,
          target_user:users!user_missions_target_user_id_fkey(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMissions(data || [])
    } catch (error) {
      console.error('Error fetching missions:', error)
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
        fetchMissions()
      } catch (error) {
        console.error('Error completing mission:', error)
        showToast('error', 'Failed to complete mission')
      }
    } else {
      // Show QR for verification
      setSelectedMission(mission)
    }
  }

  const activeMissions = missions.filter(m => m.status === 'assigned')
  const completedMissions = missions.filter(m => m.status === 'completed')

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
            {/* Active Missions */}
            {activeMissions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  📋 Active
                  <Badge variant="purple" size="sm">{activeMissions.length}</Badge>
                </h3>

                <div className="space-y-3">
                  {activeMissions.map((mission) => (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      onComplete={() => handleComplete(mission)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Missions */}
            {completedMissions.length > 0 && (
              <div>
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

            {missions.length === 0 && (
              <div className="text-center py-12">
                <span className="text-5xl block mb-4">🎯</span>
                <p className="text-slate-400">No missions yet!</p>
                <p className="text-slate-500 text-sm mt-2">
                  Missions will be assigned soon...
                </p>
              </div>
            )}

            {/* Warning */}
            <div className="mt-8 bg-status-warning/10 rounded-xl p-4">
              <p className="text-status-warning text-sm">
                ⚠️ Missions are SECRET! Don't reveal yours to others.
              </p>
            </div>
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
