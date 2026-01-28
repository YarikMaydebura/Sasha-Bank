import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { supabase } from '../lib/supabase'

export function MissionConfirm() {
  const { missionId, userId } = useParams()
  const navigate = useNavigate()
  const currentUser = useUserStore((state) => state.user)
  const showToast = useUIStore((state) => state.showToast)

  const [mission, setMission] = useState(null)
  const [missionOwner, setMissionOwner] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMissionData()
  }, [missionId, userId])

  const fetchMissionData = async () => {
    try {
      // Fetch mission details
      const { data: missionData, error: missionError } = await supabase
        .from('user_missions')
        .select('*')
        .eq('id', missionId)
        .single()

      if (missionError) throw missionError

      // Fetch mission owner
      const { data: ownerData, error: ownerError } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', missionData.user_id)
        .single()

      if (ownerError) throw ownerError

      setMission(missionData)
      setMissionOwner(ownerData)

      // Validate confirmation eligibility
      if (missionData.status === 'completed') {
        setError('This mission is already completed')
      } else if (!missionData.requires_confirmation) {
        setError('This mission does not require confirmation')
      } else if (missionData.verification === 'target' && missionData.target_user_id !== currentUser.id) {
        setError('Only the target user can confirm this mission')
      }
    } catch (err) {
      console.error('Error fetching mission:', err)
      setError('Mission not found')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!mission || !missionOwner) return

    setIsConfirming(true)

    try {
      // Update mission as completed
      const { error: updateError } = await supabase
        .from('user_missions')
        .update({
          status: 'completed',
          confirmed_by_user_id: currentUser.id,
          confirmed_by_user_name: currentUser.name,
          confirmed_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq('id', missionId)

      if (updateError) throw updateError

      // Award coins to mission owner
      const reward = mission.reward || 5

      const { data: ownerData } = await supabase
        .from('users')
        .select('balance')
        .eq('id', missionOwner.id)
        .single()

      const newBalance = (ownerData?.balance || 0) + reward

      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', missionOwner.id)

      // Create transaction
      await supabase.from('transactions').insert({
        to_user_id: missionOwner.id,
        amount: reward,
        type: 'mission_reward',
        description: `Mission completed: ${mission.title || 'Mission'}`,
      })

      // Notify mission owner
      await supabase.from('notifications').insert({
        user_id: missionOwner.id,
        type: 'mission_confirmed',
        title: '✅ Mission Confirmed!',
        message: `${currentUser.name} confirmed your mission "${mission.title}". You earned ${reward}🪙!`,
        data: {
          mission_id: missionId,
          confirmed_by: currentUser.name,
          reward,
        },
      })

      showToast('success', `Mission confirmed! ${missionOwner.name} earned ${reward}🪙`)

      // Navigate back to missions
      setTimeout(() => {
        navigate('/missions')
      }, 1500)
    } catch (err) {
      console.error('Error confirming mission:', err)
      showToast('error', 'Failed to confirm mission')
    } finally {
      setIsConfirming(false)
    }
  }

  if (!currentUser) return null

  return (
    <>
      <Header title="Confirm Mission" showBack />

      <PageWrapper className="pt-0">
        {isLoading ? (
          <Card className="text-center py-8">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-slate-400">Loading mission...</p>
          </Card>
        ) : error ? (
          <Card className="text-center py-8">
            <span className="text-5xl block mb-4">❌</span>
            <p className="text-red-400 font-semibold mb-2">Error</p>
            <p className="text-slate-400">{error}</p>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => navigate('/missions')}
            >
              Back to Missions
            </Button>
          </Card>
        ) : mission && missionOwner ? (
          <div className="space-y-6">
            {/* Mission Owner Info */}
            <Card>
              <div className="text-center">
                <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-4xl">🎯</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {missionOwner.name}'s Mission
                </h2>
                <p className="text-slate-400 text-sm">
                  {mission.verification === 'witness' ? 'Witness Confirmation' : 'Target Confirmation'}
                </p>
              </div>
            </Card>

            {/* Mission Details */}
            <Card>
              <h3 className="text-white font-semibold mb-2">Mission</h3>
              <p className="text-slate-300 mb-4">{mission.title}</p>

              {mission.description && (
                <>
                  <h3 className="text-white font-semibold mb-2">Description</h3>
                  <p className="text-slate-400 text-sm mb-4">{mission.description}</p>
                </>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-slate-400 text-sm">Reward</span>
                <span className="text-coin-gold font-bold text-lg">
                  {mission.reward || 5}🪙
                </span>
              </div>
            </Card>

            {/* Confirmation Info */}
            <Card className="bg-purple-500/10 border-purple-500/30">
              <p className="text-purple-300 text-sm mb-2">
                {mission.verification === 'witness'
                  ? '✅ You are witnessing that this mission was completed'
                  : '✅ You are confirming that you participated in this mission'}
              </p>
              <p className="text-slate-400 text-xs">
                {missionOwner.name} will receive {mission.reward || 5} coins upon confirmation
              </p>
            </Card>

            {/* Confirm Button */}
            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                onClick={handleConfirm}
                loading={isConfirming}
                size="lg"
              >
                ✅ Confirm Mission
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => navigate('/missions')}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </PageWrapper>
    </>
  )
}
