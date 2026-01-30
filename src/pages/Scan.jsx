import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { BottomNav } from '../components/layout/BottomNav'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import { getStepByQRId, isChainQR } from '../data/chainMissions'
import { getHiddenQRById, isHiddenQR } from '../data/hiddenQRCodes'
import { initiateSteal } from '../lib/stealSystem'

export function Scan() {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const showToast = useUIStore((state) => state.showToast)
  const [isScanning, setIsScanning] = useState(false)
  const [scanner, setScanner] = useState(null)
  const [showQRMenu, setShowQRMenu] = useState(false)
  const [scannedUser, setScannedUser] = useState(null)
  const [chainResult, setChainResult] = useState(null)
  const [hiddenResult, setHiddenResult] = useState(null)
  const updateBalance = useUserStore((state) => state.updateBalance)

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scanner) {
        scanner.stop().catch(() => {})
      }
    }
  }, [scanner])

  const startScanning = async () => {
    try {
      const html5QrCode = new Html5Qrcode('qr-reader')
      setScanner(html5QrCode)

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleQRCode(decodedText)
          stopScanning(html5QrCode)
        },
        () => {} // Ignore scan errors
      )

      setIsScanning(true)
    } catch (error) {
      console.error('Error starting scanner:', error)
      if (error.name === 'NotAllowedError') {
        showToast('error', 'Camera permission denied')
      } else {
        showToast('error', 'Could not access camera')
      }
    }
  }

  const stopScanning = async (scannerInstance = scanner) => {
    if (scannerInstance) {
      try {
        await scannerInstance.stop()
      } catch (error) {
        console.error('Error stopping scanner:', error)
      }
    }
    setIsScanning(false)
  }

  const handleQRCode = async (text) => {
    // Parse QR code content
    const parts = text.split(':')

    switch (parts[0]) {
      case 'user':
        // User QR: user:userId:qrCode
        // Fetch user data and show menu
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('id, name, balance')
            .eq('id', parts[1])
            .single()

          if (error) throw error

          setScannedUser(userData)
          setShowQRMenu(true)
        } catch (error) {
          console.error('Error fetching user:', error)
          showToast('error', 'User not found')
        }
        break

      case 'station':
        // Station QR: station:stationName
        navigate(`/${parts[1]}`)
        break

      case 'mission':
        // Mission confirmation QR: mission:missionId:userId
        navigate(`/mission-confirm/${parts[1]}/${parts[2]}`)
        break

      case 'bar':
        navigate('/bar')
        break

      case 'trivia':
        navigate('/trivia')
        break

      case 'risk':
        navigate('/risk')
        break

      default:
        // V3.0 - Check for chain and hidden QR codes
        if (isChainQR(text)) {
          await handleChainQR(text)
        } else if (isHiddenQR(text)) {
          await handleHiddenQR(text)
        } else if (text.startsWith('steal:')) {
          // Steal mission: steal:attackerId:victimId
          const victimId = parts[2]
          if (victimId === user.id) {
            showToast('error', "You can't steal from yourself!")
          } else {
            await initiateSteal(user.id, victimId)
            showToast('success', '🥷 Steal attempt initiated!')
          }
        } else {
          showToast('info', `Scanned: ${text}`)
        }
    }
  }

  // V3.0 - Handle chain QR code scan
  const handleChainQR = async (qrId) => {
    const result = getStepByQRId(qrId)
    if (!result) {
      showToast('error', 'Unknown chain QR code')
      return
    }

    const { chain, step } = result

    try {
      // Check user's progress in this chain
      const { data: progress } = await supabase
        .from('chain_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('chain_id', chain.id)
        .single()

      // If no progress exists and this is step 1, start the chain
      if (!progress && step.step === 1) {
        await supabase.from('chain_progress').insert({
          user_id: user.id,
          chain_id: chain.id,
          current_step: 1,
          completed: false
        })

        setChainResult({
          type: 'started',
          chain,
          step,
          nextHint: chain.steps[1]?.hint
        })
        return
      }

      // If chain already completed
      if (progress?.completed) {
        showToast('info', `You've already completed ${chain.name}!`)
        return
      }

      // Check if this is the next step
      const currentStep = progress?.current_step || 0
      if (step.step !== currentStep + 1) {
        if (step.step <= currentStep) {
          showToast('info', 'Already scanned this step!')
        } else {
          showToast('error', `Find step ${currentStep + 1} first!`)
        }
        return
      }

      // Update progress
      const isLastStep = step.step === chain.steps.length
      await supabase
        .from('chain_progress')
        .update({
          current_step: step.step,
          completed: isLastStep
        })
        .eq('id', progress.id)

      if (isLastStep) {
        // Award chain completion reward
        const newBalance = user.balance + chain.reward
        await supabase.from('users').update({ balance: newBalance }).eq('id', user.id)
        updateBalance(newBalance)

        await supabase.from('transactions').insert({
          to_user_id: user.id,
          amount: chain.reward,
          type: 'chain_complete',
          description: `Completed ${chain.name} chain`
        })

        setChainResult({
          type: 'completed',
          chain,
          reward: chain.reward
        })
      } else {
        setChainResult({
          type: 'progress',
          chain,
          step,
          currentStep: step.step,
          totalSteps: chain.steps.length,
          nextHint: chain.steps[step.step]?.hint
        })
      }
    } catch (error) {
      console.error('Error processing chain QR:', error)
      showToast('error', 'Failed to process chain QR')
    }
  }

  // V3.0 - Handle hidden QR code scan
  const handleHiddenQR = async (qrId) => {
    const hidden = getHiddenQRById(qrId)
    if (!hidden) {
      showToast('error', 'Unknown hidden QR code')
      return
    }

    try {
      // Check if user already scanned this
      const { data: existingScan } = await supabase
        .from('hidden_qr_scans')
        .select('*')
        .eq('qr_id', qrId)
        .eq('user_id', user.id)
        .single()

      if (existingScan) {
        showToast('info', 'You already found this one!')
        return
      }

      // Check total scans for this QR
      const { count } = await supabase
        .from('hidden_qr_scans')
        .select('*', { count: 'exact', head: true })
        .eq('qr_id', qrId)

      if (count >= hidden.max_scans) {
        showToast('error', 'Too late! This QR has been claimed by others.')
        return
      }

      // Record the scan
      await supabase.from('hidden_qr_scans').insert({
        qr_id: qrId,
        user_id: user.id,
        reward_type: hidden.reward_type,
        reward_amount: hidden.reward_amount || 0
      })

      // Process reward based on type
      if (hidden.reward_type === 'coins' || hidden.reward_type === 'trap') {
        const amount = hidden.reward_amount
        const newBalance = Math.max(0, user.balance + amount)
        await supabase.from('users').update({ balance: newBalance }).eq('id', user.id)
        updateBalance(newBalance)

        await supabase.from('transactions').insert({
          to_user_id: user.id,
          amount: Math.abs(amount),
          type: amount >= 0 ? 'hidden_qr_coins' : 'hidden_qr_trap',
          description: hidden.message
        })

        setHiddenResult({
          ...hidden,
          found_position: count + 1
        })
      } else if (hidden.reward_type === 'card') {
        // Award card
        const { data: cardData } = await supabase
          .from('cards')
          .select('*')
          .eq('id', hidden.reward_card_id)
          .single()

        if (cardData) {
          await supabase.from('user_cards').insert({
            user_id: user.id,
            card_id: hidden.reward_card_id,
            card_name: cardData.name,
            card_emoji: cardData.emoji,
            description: cardData.description,
            rarity: cardData.rarity,
            status: 'owned',
            obtained_from: 'hidden_qr'
          })
        }

        setHiddenResult({
          ...hidden,
          found_position: count + 1,
          card: cardData
        })
      }
    } catch (error) {
      console.error('Error processing hidden QR:', error)
      showToast('error', 'Failed to process hidden QR')
    }
  }

  const handleSendCoins = () => {
    setShowQRMenu(false)
    navigate('/trade', { state: { recipientId: scannedUser.id, recipientName: scannedUser.name } })
  }

  const handlePoke = async () => {
    try {
      await supabase.from('notifications').insert({
        user_id: scannedUser.id,
        type: 'poke',
        title: '👋 Poke!',
        message: `${user.name} poked you!`,
        data: { from_user_id: user.id, from_user_name: user.name },
      })

      showToast('success', `Poked ${scannedUser.name}!`)
      setShowQRMenu(false)
    } catch (error) {
      console.error('Error sending poke:', error)
      showToast('error', 'Failed to send poke')
    }
  }

  const handleUseStealCard = async () => {
    // Check if user has a steal card
    const { data: stealCards } = await supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('card_id', 'steal')
      .eq('status', 'owned')
      .limit(1)

    if (!stealCards || stealCards.length === 0) {
      showToast('error', "You don't have a Steal card")
      return
    }

    setShowQRMenu(false)
    navigate('/my-cards', { state: { autoUseCard: stealCards[0], targetUser: scannedUser } })
  }

  return (
    <>
      <Header title="Scan QR" showBalance />

      <PageWrapper withNav className="pt-0">
        <div className="text-center py-4">
          <span className="text-5xl">📷</span>
          <p className="text-slate-400 mt-2">
            Scan QR codes to interact with stations and guests
          </p>
        </div>

        {/* Scanner area - CRITICAL: bg-black fixes purple screen bug */}
        <Card className={cn('overflow-hidden', !isScanning && 'py-12')}>
          <div id="qr-reader" className="w-full bg-black rounded-xl overflow-hidden" />

          {!isScanning && (
            <div className="text-center">
              <Button variant="gold" size="lg" onClick={startScanning}>
                📷 Start Scanning
              </Button>
            </div>
          )}

          {isScanning && (
            <div className="mt-4 text-center">
              <Button variant="ghost" onClick={() => stopScanning()}>
                Stop Scanning
              </Button>
            </div>
          )}
        </Card>

        {/* Quick actions */}
        <div className="mt-6 space-y-3">
          <p className="text-slate-400 text-sm">Or go directly to:</p>

          <div className="grid grid-cols-2 gap-3">
            <Card hoverable onClick={() => navigate('/bar')}>
              <div className="text-center py-2">
                <span className="text-2xl">🍸</span>
                <p className="text-white text-sm mt-1">Bar</p>
              </div>
            </Card>
            <Card hoverable onClick={() => navigate('/trivia')}>
              <div className="text-center py-2">
                <span className="text-2xl">🧠</span>
                <p className="text-white text-sm mt-1">Trivia</p>
              </div>
            </Card>
            <Card hoverable onClick={() => navigate('/risk')}>
              <div className="text-center py-2">
                <span className="text-2xl">🎲</span>
                <p className="text-white text-sm mt-1">Risk</p>
              </div>
            </Card>
            <Card hoverable onClick={() => navigate('/lottery')}>
              <div className="text-center py-2">
                <span className="text-2xl">🎰</span>
                <p className="text-white text-sm mt-1">Lottery</p>
              </div>
            </Card>
          </div>
        </div>

        {/* QR Scan Menu Modal */}
        <Modal
          isOpen={showQRMenu}
          onClose={() => {
            setShowQRMenu(false)
            setScannedUser(null)
          }}
          title={scannedUser ? `${scannedUser.name}` : 'User Menu'}
        >
          {scannedUser && (
            <div className="space-y-3">
              <div className="text-center pb-4 border-b border-white/10">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-3xl">👤</span>
                </div>
                <h3 className="text-xl font-bold text-white">{scannedUser.name}</h3>
                <p className="text-slate-400 text-sm">{scannedUser.balance}🪙</p>
              </div>

              {/* Menu Options */}
              <Card hoverable onClick={handleSendCoins}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💸</span>
                  <div className="flex-1">
                    <p className="text-white font-medium">Send Coins</p>
                    <p className="text-slate-400 text-xs">Transfer coins to {scannedUser.name}</p>
                  </div>
                </div>
              </Card>

              <Card hoverable onClick={handlePoke}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👋</span>
                  <div className="flex-1">
                    <p className="text-white font-medium">Poke</p>
                    <p className="text-slate-400 text-xs">Send a fun notification</p>
                  </div>
                </div>
              </Card>

              <Card hoverable onClick={handleUseStealCard}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div className="flex-1">
                    <p className="text-white font-medium">Use Steal Card</p>
                    <p className="text-slate-400 text-xs">Steal coins with your card</p>
                  </div>
                </div>
              </Card>

              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setShowQRMenu(false)
                  setScannedUser(null)
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </Modal>
      </PageWrapper>

      <BottomNav />

      {/* V3.0 - Chain Progress Modal */}
      <Modal
        isOpen={!!chainResult}
        onClose={() => setChainResult(null)}
        title={chainResult?.chain?.name || 'Chain Mission'}
      >
        {chainResult && (
          <div className="text-center py-4">
            <div className="text-6xl mb-4">{chainResult.chain.emoji}</div>

            {chainResult.type === 'started' && (
              <>
                <h3 className="text-xl font-bold text-white mb-2">Chain Started!</h3>
                <p className="text-slate-400 mb-4">
                  You've started the {chainResult.chain.name} chain.
                </p>
                <div className="bg-purple-500/20 rounded-lg p-4 mb-4">
                  <p className="text-purple-300 text-sm">Next hint:</p>
                  <p className="text-white font-medium">{chainResult.nextHint}</p>
                </div>
                <p className="text-slate-500 text-sm">
                  Complete all 5 steps for {chainResult.chain.reward}🪙!
                </p>
              </>
            )}

            {chainResult.type === 'progress' && (
              <>
                <h3 className="text-xl font-bold text-green-400 mb-2">Step {chainResult.currentStep} Complete!</h3>
                <div className="flex justify-center gap-1 mb-4">
                  {Array.from({ length: chainResult.totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-3 h-3 rounded-full',
                        i < chainResult.currentStep ? 'bg-green-500' : 'bg-slate-600'
                      )}
                    />
                  ))}
                </div>
                <div className="bg-purple-500/20 rounded-lg p-4 mb-4">
                  <p className="text-purple-300 text-sm">Next hint:</p>
                  <p className="text-white font-medium">{chainResult.nextHint}</p>
                </div>
              </>
            )}

            {chainResult.type === 'completed' && (
              <>
                <h3 className="text-2xl font-bold text-coin-gold mb-2">🎉 CHAIN COMPLETE!</h3>
                <p className="text-slate-400 mb-4">
                  You completed the {chainResult.chain.name} chain!
                </p>
                <div className="bg-coin-gold/20 rounded-lg p-4 mb-4">
                  <p className="text-coin-gold text-3xl font-bold">+{chainResult.reward}🪙</p>
                </div>
              </>
            )}

            <Button fullWidth onClick={() => setChainResult(null)}>
              Continue
            </Button>
          </div>
        )}
      </Modal>

      {/* V3.0 - Hidden QR Result Modal */}
      <Modal
        isOpen={!!hiddenResult}
        onClose={() => setHiddenResult(null)}
        title={hiddenResult?.name || 'Hidden Discovery'}
      >
        {hiddenResult && (
          <div className="text-center py-4">
            <div className="text-6xl mb-4">{hiddenResult.emoji}</div>

            <h3 className="text-xl font-bold text-white mb-2">{hiddenResult.name}</h3>
            <p className="text-slate-400 mb-4">{hiddenResult.message}</p>

            {hiddenResult.reward_type === 'coins' && (
              <div className="bg-coin-gold/20 rounded-lg p-4 mb-4">
                <p className="text-coin-gold text-3xl font-bold">+{hiddenResult.reward_amount}🪙</p>
              </div>
            )}

            {hiddenResult.reward_type === 'trap' && (
              <div className="bg-red-500/20 rounded-lg p-4 mb-4">
                <p className="text-red-400 text-3xl font-bold">{hiddenResult.reward_amount}🪙</p>
              </div>
            )}

            {hiddenResult.reward_type === 'card' && (
              <div className="bg-purple-500/20 rounded-lg p-4 mb-4">
                <p className="text-purple-300 text-sm">You got a card!</p>
                <p className="text-white text-xl font-bold">
                  {hiddenResult.card?.emoji} {hiddenResult.card?.name}
                </p>
              </div>
            )}

            <p className="text-slate-500 text-sm mb-4">
              #{hiddenResult.found_position} of {hiddenResult.max_scans} to find this
            </p>

            <Button fullWidth onClick={() => setHiddenResult(null)}>
              Awesome!
            </Button>
          </div>
        )}
      </Modal>
    </>
  )
}
