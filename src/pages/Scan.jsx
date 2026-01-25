import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { BottomNav } from '../components/layout/BottomNav'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useUIStore } from '../stores/uiStore'
import { cn } from '../lib/utils'

export function Scan() {
  const navigate = useNavigate()
  const showToast = useUIStore((state) => state.showToast)
  const [isScanning, setIsScanning] = useState(false)
  const [scanner, setScanner] = useState(null)

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
      showToast('error', 'Could not access camera')
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

  const handleQRCode = (text) => {
    // Parse QR code content
    const parts = text.split(':')

    switch (parts[0]) {
      case 'user':
        // User QR: user:userId:qrCode
        navigate(`/user/${parts[1]}`)
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

      case 'box':
        navigate('/box')
        break

      default:
        showToast('info', `Scanned: ${text}`)
    }
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

        {/* Scanner area */}
        <Card className={cn('overflow-hidden', !isScanning && 'py-12')}>
          <div id="qr-reader" className="w-full" />

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
            <Card hoverable onClick={() => navigate('/box')}>
              <div className="text-center py-2">
                <span className="text-2xl">📦</span>
                <p className="text-white text-sm mt-1">The Box</p>
              </div>
            </Card>
          </div>
        </div>
      </PageWrapper>

      <BottomNav />
    </>
  )
}
