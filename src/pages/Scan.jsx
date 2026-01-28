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

export function Scan() {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const showToast = useUIStore((state) => state.showToast)
  const [isScanning, setIsScanning] = useState(false)
  const [scanner, setScanner] = useState(null)
  const [showQRMenu, setShowQRMenu] = useState(false)
  const [scannedUser, setScannedUser] = useState(null)

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
        showToast('info', `Scanned: ${text}`)
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
    </>
  )
}
