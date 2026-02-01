import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { getRandomPrompt, photoPrompts } from '../data/photoPrompts'
import { cn } from '../lib/utils'

const PHOTO_REWARD = 5

export function Photos() {
  const [photos, setPhotos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [stream, setStream] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [facingMode, setFacingMode] = useState('environment') // Back camera by default

  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const [searchParams, setSearchParams] = useSearchParams()

  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    fetchPhotos()
    return () => {
      stopCamera()
    }
  }, [user?.id])

  // Check for specific prompt from notification URL params
  useEffect(() => {
    const promptId = searchParams.get('promptId')
    const promptText = searchParams.get('promptText')
    const promptEmoji = searchParams.get('promptEmoji')

    if (promptId && promptText) {
      setCurrentPrompt({
        id: promptId,
        text: promptText,
        emoji: promptEmoji || '📸'
      })
    }
  }, [searchParams])

  const fetchPhotos = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPhotos(data || [])
    } catch (error) {
      console.error('Error fetching photos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGetPrompt = () => {
    const prompt = getRandomPrompt()
    setCurrentPrompt(prompt)
  }

  const startCamera = async () => {
    setIsCameraLoading(true)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: false,
      })

      setStream(mediaStream)
      setIsCameraActive(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        // CRITICAL: Explicit play() for iOS browsers
        try {
          await videoRef.current.play()
        } catch (playError) {
          console.error('Video play error:', playError)
        }
      }
    } catch (error) {
      console.error('Camera error:', error)
      if (error.name === 'NotAllowedError') {
        showToast('error', 'Camera permission denied')
      } else {
        showToast('error', 'Failed to access camera')
      }
    } finally {
      setIsCameraLoading(false)
    }
  }

  // Flip camera between front and back
  const flipCamera = async () => {
    // Stop current camera
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    // Toggle facing mode
    const newMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newMode)
    // Small delay before restarting
    setIsCameraLoading(true)
    setTimeout(async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newMode },
          audio: false,
        })
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          try {
            await videoRef.current.play()
          } catch (playError) {
            console.error('Video play error:', playError)
          }
        }
      } catch (error) {
        console.error('Camera flip error:', error)
        showToast('error', 'Failed to switch camera')
      } finally {
        setIsCameraLoading(false)
      }
    }, 100)
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsCameraActive(false)
    setIsCameraLoading(false)
    setCapturedImage(null)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    // Use video dimensions, fallback to reasonable defaults for iOS
    const width = video.videoWidth || 640
    const height = video.videoHeight || 480

    if (width === 0 || height === 0) {
      showToast('error', 'Camera not ready yet, try again')
      return
    }

    canvas.width = width
    canvas.height = height

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(imageDataUrl)

    // Stop camera tracks but keep state for preview
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsCameraActive(false)
  }

  const handleSubmitPhoto = async () => {
    if (!capturedImage || !currentPrompt) return

    setIsUploading(true)

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage)
      const blob = await response.blob()

      // Upload to Supabase Storage
      const fileName = `${user.id}-${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)

      // Save to database
      const { error: dbError } = await supabase.from('photos').insert({
        user_id: user.id,
        prompt_id: currentPrompt.id,
        prompt_text: currentPrompt.text,
        photo_url: urlData.publicUrl,
        status: 'approved',
        reward_claimed: true,
      })

      if (dbError) throw dbError

      // Award coins
      const newBalance = (user.balance || 0) + PHOTO_REWARD

      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        to_user_id: user.id,
        amount: PHOTO_REWARD,
        type: 'photo_reward',
        description: `Photo challenge: ${currentPrompt.text}`,
      })

      updateBalance(newBalance)
      showToast('success', `📸 Photo submitted! +${PHOTO_REWARD}🪙`)

      // Mark notification as read if this came from a photo challenge notification
      const promptId = searchParams.get('promptId')
      if (promptId) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('data->>prompt_id', promptId)

        // Clear URL params
        setSearchParams({})
      }

      // Reset
      setCapturedImage(null)
      setCurrentPrompt(null)
      fetchPhotos()
    } catch (error) {
      console.error('Error submitting photo:', error)
      showToast('error', 'Failed to submit photo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
    startCamera()
  }

  return (
    <>
      <Header title="Photo Challenges" showBack showBalance />

      <PageWrapper className="pt-0">
        <div className="text-center py-8">
          <span className="text-6xl block mb-4">📸</span>
          <h2 className="text-2xl font-bold text-white mb-2">PHOTO BOOTH</h2>
          <div className="h-0.5 w-16 bg-pastel-purple mx-auto my-4" />
        </div>

        {/* Info Card */}
        <Card className="mb-6 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/30">
          <div className="flex items-start gap-3">
            <span className="text-3xl">✨</span>
            <div>
              <h3 className="text-white font-semibold mb-1">Earn {PHOTO_REWARD} coins per photo!</h3>
              <p className="text-slate-300 text-sm">
                Get a random photo challenge, snap a pic, and earn coins instantly!
              </p>
            </div>
          </div>
        </Card>

        {/* Current Prompt */}
        {!currentPrompt && !isCameraActive && !capturedImage && (
          <Card className="text-center mb-6">
            <span className="text-5xl block mb-4">🎯</span>
            <p className="text-white font-semibold mb-2">Ready for a challenge?</p>
            <p className="text-slate-400 text-sm mb-4">
              Get a random photo prompt and earn {PHOTO_REWARD} coins!
            </p>
            <Button variant="primary" size="lg" fullWidth onClick={handleGetPrompt}>
              📸 GET PHOTO CHALLENGE
            </Button>
          </Card>
        )}

        {/* Show Prompt */}
        {currentPrompt && !isCameraActive && !capturedImage && (
          <Card className="mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/40">
            <div className="text-center mb-4">
              <span className="text-6xl block mb-3">{currentPrompt.emoji}</span>
              <h3 className="text-white text-xl font-bold mb-2">Your Challenge:</h3>
              <p className="text-purple-300 text-lg">{currentPrompt.text}</p>
            </div>

            <div className="space-y-2">
              <Button variant="success" size="lg" fullWidth onClick={startCamera}>
                📷 OPEN CAMERA
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setCurrentPrompt(null)}>
                Get Different Challenge
              </Button>
            </div>
          </Card>
        )}

        {/* Camera View */}
        {isCameraActive && !capturedImage && (
          <Card className="mb-6 p-0 overflow-hidden">
            <div className="relative bg-black min-h-[300px]">
              {/* Loading state */}
              {isCameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
                  <Spinner />
                  <p className="text-white mt-2 text-sm">Starting camera...</p>
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                webkit-playsinline="true"
                className="w-full aspect-[4/3] object-cover bg-black"
                onLoadedMetadata={() => {
                  // Ensure video plays when metadata loaded (backup for iOS)
                  videoRef.current?.play().catch(() => {})
                }}
              />

              {currentPrompt && (
                <div className="absolute top-4 left-0 right-0 text-center z-20">
                  <Badge variant="purple" size="lg">
                    {currentPrompt.emoji} {currentPrompt.text}
                  </Badge>
                </div>
              )}

              {/* Flip camera button */}
              <button
                onClick={flipCamera}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white z-20"
                disabled={isCameraLoading}
              >
                🔄
              </button>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
                <div className="flex justify-center gap-3">
                  <Button variant="ghost" onClick={stopCamera}>
                    ❌ Cancel
                  </Button>
                  <Button variant="primary" size="lg" onClick={capturePhoto} disabled={isCameraLoading}>
                    📸 CAPTURE
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Preview Captured Image */}
        {capturedImage && (
          <Card className="mb-6 p-0 overflow-hidden">
            <div className="relative">
              <img src={capturedImage} alt="Captured" className="w-full h-auto" />

              {currentPrompt && (
                <div className="absolute top-4 left-0 right-0 text-center">
                  <Badge variant="success" size="lg">
                    {currentPrompt.emoji} {currentPrompt.text}
                  </Badge>
                </div>
              )}
            </div>

            <div className="p-4 space-y-2">
              <Button
                variant="success"
                size="lg"
                fullWidth
                onClick={handleSubmitPhoto}
                loading={isUploading}
              >
                ✅ SUBMIT & EARN {PHOTO_REWARD}🪙
              </Button>
              <Button variant="ghost" fullWidth onClick={handleRetake}>
                🔄 Retake Photo
              </Button>
            </div>
          </Card>
        )}

        {/* Your Photos */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            YOUR PHOTOS ({photos.length})
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => {
                const prompt = photoPrompts.find((p) => p.id === photo.prompt_id)
                return (
                  <Card key={photo.id} className="p-0 overflow-hidden">
                    <div className="relative">
                      <img
                        src={photo.photo_url}
                        alt={photo.prompt_text}
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="success" size="sm">
                          +{PHOTO_REWARD}🪙
                        </Badge>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-slate-300 text-xs">
                        {prompt?.emoji} {photo.prompt_text}
                      </p>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="text-center text-slate-400 py-8">
              No photos yet. Complete a challenge to get started!
            </Card>
          )}
        </div>
      </PageWrapper>
    </>
  )
}
